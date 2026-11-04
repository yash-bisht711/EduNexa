import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { User } from '../models/index.js';
import { auth } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { publicUploadUrl } from '../services/storage.js';
import avatarUpload from "../middleware/avatarUpload.js";
import { uploadAvatarToCloudinary } from "../services/avatarStorage.js";

const router = Router();

const tokenFor = (u) =>
  jwt.sign(
    { sub: u._id, role: u.role },
    process.env.JWT_SECRET || 'dev_only_change_me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const safe = (u) => ({
  id: u._id,
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  bio: u.bio || '',
  avatar: u.avatar || '',
  createdAt: u.createdAt,
});

// Configure multer for avatar uploads
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max avatar size
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed'));
    }
  },
});

// ─── REGISTER ──────────────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be self-registered' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email address already exists' });
    }

    const u = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(password, 12),
      role: role === 'instructor' ? 'instructor' : 'student',
    });

    res.status(201).json({ token: tokenFor(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});

// ─── LOGIN ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const u = await User.findOne({ email: email.toLowerCase().trim() });
    if (!u || !(await bcrypt.compare(password || '', u.passwordHash))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    res.json({ token: tokenFor(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});

// ─── DEDICATED ADMIN LOGIN ─────────────────────────────────────────────
router.post('/admin-login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const u = await User.findOne({ email: email.toLowerCase().trim() });
    if (!u || !(await bcrypt.compare(password || '', u.passwordHash))) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    if (u.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied: This portal is strictly restricted to EduNexa Administrators.',
      });
    }

    res.json({ token: tokenFor(u), user: safe(u) });
  } catch (e) {
    next(e);
  }
});

// ─── FORGOT PASSWORD ───────────────────────────────────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const u = await User.findOne({ email: email.toLowerCase().trim() });
    if (!u) {
      // Return ambiguous message for security, or specific message for convenience
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (role === 'admin' && u.role !== 'admin') {
      return res.status(403).json({
        message: 'This account does not have administrator privileges.',
      });
    }

    // Generate 6-digit OTP code and crypto reset token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    u.resetPasswordOtp = otp;
    u.resetPasswordToken = token;
    u.resetPasswordExpires = expires;
    await u.save();

    const clientUrl = req.headers.origin || process.env.CLIENT_URL || 'http://localhost:5173';
    // Send email asynchronously in the background so the user gets an instant response
    sendPasswordResetEmail({
      to: u.email,
      name: u.name,
      otp,
      resetToken: token,
      clientUrl,
      role: u.role,
    }).then(res => {
      if (res?.previewUrl) console.log('[Password Reset Email Preview]:', res.previewUrl);
    }).catch(err => {
      console.warn('[Email Dispatch Warning]:', err.message);
    });

    res.json({
      message: `A verification code has been sent to ${u.email}. Check your inbox.`,
      email: u.email,
      debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (e) {
    next(e);
  }
});

// ─── VERIFY RESET OTP ──────────────────────────────────────────────────
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const u = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordOtp: String(otp).trim(),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!u) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    res.json({ valid: true, message: 'Verification code confirmed' });
  } catch (e) {
    next(e);
  }
});

// ─── RESET PASSWORD ────────────────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, token, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    let u;
    if (token) {
      u = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });
    }

    if (!u && email && otp) {
      u = await User.findOne({
        email: email.toLowerCase().trim(),
        resetPasswordOtp: String(otp).trim(),
        resetPasswordExpires: { $gt: new Date() },
      });
    }

    if (!u) {
      return res.status(400).json({
        message: 'Invalid or expired password reset link/code. Please request a new one.',
      });
    }

    u.passwordHash = await bcrypt.hash(newPassword, 12);
    u.resetPasswordOtp = undefined;
    u.resetPasswordToken = undefined;
    u.resetPasswordExpires = undefined;
    await u.save();

    res.json({
      message: 'Your password has been successfully reset. You can now log in.',
    });
  } catch (e) {
    next(e);
  }
});

// ─── GET CURRENT USER PROFILE ──────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  res.json({ user: safe(req.user) });
});

// ─── UPDATE PROFILE (NAME, BIO, AVATAR) ─────────────────────────────────
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { name, bio, avatar } = req.body;
    const user = req.user;

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (bio !== undefined) {
      user.bio = String(bio).trim();
    }
    if (avatar !== undefined) {
      user.avatar = String(avatar).trim();
    }

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      user: safe(user),
    });
  } catch (e) {
    next(e);
  }
});

// ─── UPLOAD AVATAR PHOTO ───────────────────────────────────────────────
// router.post('/avatar', auth, upload.single('avatar'), async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ message: 'Please select an image file to upload' });
//     }

//     const avatarUrl = publicUploadUrl(req.file.filename);
//     req.user.avatar = avatarUrl;
//     await req.user.save();

//     res.json({
//       message: 'Avatar photo uploaded successfully',
//       avatar: avatarUrl,
//       user: safe(req.user),
//     });
//   } catch (e) {
//     next(e);
//   }
// });

// UPLOAD AVATAR TO CLOUDINARY
router.post(
  "/avatar",
  auth,
  avatarUpload.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select an image file to upload",
        });
      }

      const result = await uploadAvatarToCloudinary(
        req.file.buffer,
        req.user.id || req.user._id.toString()
      );

      const avatarUrl = result.secure_url;

      req.user.avatar = avatarUrl;

      await req.user.save();

      res.json({
        message: "Avatar photo uploaded successfully",
        avatar: avatarUrl,
        user: safe(req.user),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { LiveClass, Enrollment, Course, ChatMessage } from "../models/index.js";
import { auth, allow } from "../middleware/auth.js";
import { notifyEnrolledStudents, notifyUsers } from "../services/notify.js";
import { publicUploadUrl } from "../services/storage.js";
const r = Router();
const uploadDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads",
);
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 500) * 1024 * 1024,
  },
});

// Students see classes for courses they are enrolled in; instructors see their own; admins see all.
r.get("/classes", auth, async (req, res, next) => {
  try {
    const q = {};
    if (req.user.role === "student") {
      const enr = await Enrollment.find({ student: req.user._id }).select(
        "course",
      );
      q.course = { $in: enr.map((e) => e.course) };
    } else if (req.user.role === "instructor") {
      const own = await Course.find({ instructor: req.user._id }).select("_id");
      q.$or = [
        { instructor: req.user._id },
        { course: { $in: own.map((c) => c._id) } },
      ];
    }
    const classes = await LiveClass.find(q)
      .populate("course", "title")
      .populate("instructor", "name avatar")
      .sort({ status: "asc", startsAt: 1 });
    res.json({ classes });
  } catch (e) {
    next(e);
  }
});

r.get("/classes/:id", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Live class not found" });
    const c = await LiveClass.findById(req.params.id)
      .populate("course", "title")
      .populate("instructor", "name avatar");
    if (!c) return res.status(404).json({ message: "Live class not found" });
    const enrolled = await Enrollment.exists({
      course: c.course?._id || c.course,
      student: req.user._id,
    });
    const isHost =
      req.user.role === "admin" ||
      String(c.instructor?._id || c.instructor) === String(req.user._id);
    res.json({ liveClass: c, canJoin: !!(enrolled || isHost), isHost });
  } catch (e) {
    next(e);
  }
});

r.post(
  "/classes",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const { course, title, startsAt, endsAt, description } = req.body;
      if (!course || !title || !startsAt || !endsAt)
        return res
          .status(400)
          .json({ message: "course, title, startsAt and endsAt are required" });
      const starts = new Date(startsAt),
        ends = new Date(endsAt);
      if (isNaN(starts) || isNaN(ends) || ends <= starts)
        return res
          .status(400)
          .json({ message: "Invalid start/end time range" });
      const courseDoc = await Course.findById(course);
      if (!courseDoc)
        return res.status(404).json({ message: "Course not found" });
      if (
        req.user.role !== "admin" &&
        String(courseDoc.instructor) !== String(req.user._id)
      )
        return res.status(403).json({ message: "Not your course" });
      const roomName = `edunexa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const c = await LiveClass.create({
        course,
        title,
        description:
          typeof description === "string" ? description.slice(0, 500) : "",
        waitingRoom:
          typeof req.body.waitingRoom === "boolean"
            ? req.body.waitingRoom
            : true,
        instructor: req.user._id,
        startsAt: starts,
        endsAt: ends,
        roomName,
      });
      await c.populate([
        { path: "course", select: "title" },
        { path: "instructor", select: "name avatar" },
      ]);
      await notifyEnrolledStudents(course, {
        type: "live_class",
        title: "New live class scheduled",
        body: `"${title}" for ${courseDoc.title} is scheduled for ${starts.toLocaleString()}.`,
        link: `/live?join=${c._id}`,
      });
      res.status(201).json({ liveClass: c });
    } catch (e) {
      next(e);
    }
  },
);

const loadOwn = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const c = await LiveClass.findById(req.params.id);
  if (!c) return null;
  if (
    req.user.role !== "admin" &&
    String(c.instructor) !== String(req.user._id)
  )
    return "forbidden";
  return c;
};

r.patch(
  "/classes/:id",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const c = await loadOwn(req);
      if (c === "forbidden")
        return res.status(403).json({ message: "Not your class" });
      if (!c) return res.status(404).json({ message: "Live class not found" });
      const { title, description, startsAt, endsAt } = req.body;
      if (startsAt || endsAt) {
        if (c.status !== "scheduled")
          return res
            .status(400)
            .json({ message: "Only scheduled classes can be rescheduled" });
        const starts = new Date(startsAt || c.startsAt),
          ends = new Date(endsAt || c.endsAt);
        if (isNaN(starts) || isNaN(ends) || ends <= starts)
          return res
            .status(400)
            .json({ message: "Invalid start/end time range" });
        c.startsAt = starts;
        c.endsAt = ends;
        c.reminderSentAt = null;
      }
      if (typeof title === "string" && title.trim()) c.title = title.trim();
      if (typeof description === "string")
        c.description = description.slice(0, 500);
      await c.save();
      await notifyEnrolledStudents(c.course, {
        type: "live_class",
        title: "Live class updated",
        body: `"${c.title}" is now scheduled for ${new Date(c.startsAt).toLocaleString()}.`,
        link: `/live?join=${c._id}`,
      });
      res.json({ liveClass: c });
    } catch (e) {
      next(e);
    }
  },
);

r.patch(
  "/classes/:id/status",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!["live", "ended"].includes(status))
        return res
          .status(400)
          .json({ message: "status must be live or ended" });
      const c = await loadOwn(req);
      if (c === "forbidden")
        return res.status(403).json({ message: "Not your class" });
      if (!c) return res.status(404).json({ message: "Live class not found" });
      c.status = status;
      if (status === "live") {
        c.startedAt = new Date();
        c.reminderSentAt = c.reminderSentAt || new Date();
      }
      if (status === "ended") c.endedAt = new Date();
      await c.save();
      if (status === "live")
        await notifyEnrolledStudents(c.course, {
          type: "live_class",
          title: "Live class is now streaming",
          body: `"${c.title}" is live. Join the room now!`,
          link: `/live?join=${c._id}`,
        });
      res.json({ liveClass: c });
    } catch (e) {
      next(e);
    }
  },
);

r.delete(
  "/classes/:id",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const c = await loadOwn(req);
      if (c === "forbidden")
        return res.status(403).json({ message: "Not your class" });
      if (!c) return res.status(404).json({ message: "Live class not found" });
      if (c.status === "live")
        return res
          .status(400)
          .json({ message: "End the class before cancelling it" });
      c.status = "cancelled";
      await c.save();
      await notifyEnrolledStudents(c.course, {
        type: "live_class",
        title: "Live class cancelled",
        body: `"${c.title}" has been cancelled.`,
        link: "/live",
      });
      res.json({ liveClass: c });
    } catch (e) {
      next(e);
    }
  },
);

r.delete(
  "/classes/:id/remove",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const c = await loadOwn(req);
      if (c === "forbidden")
        return res.status(403).json({ message: "Not your class" });
      if (!c) return res.status(404).json({ message: "Live class not found" });
      if (c.status === "live")
        return res
          .status(400)
          .json({ message: "End the class before deleting it" });
      const wasUpcomingScheduled =
        c.status === "scheduled" && new Date(c.startsAt) > new Date();
      const title = c.title;
      const courseId = c.course;
      await ChatMessage.deleteMany({ roomName: c.roomName });
      await c.deleteOne();
      if (wasUpcomingScheduled)
        await notifyEnrolledStudents(courseId, {
          type: "live_class",
          title: "Live class removed",
          body: `"${title}" is no longer on the schedule.`,
          link: "/live",
        });
      res.json({ message: "Live class deleted" });
    } catch (e) {
      next(e);
    }
  },
);

r.get("/classes/:id/messages", auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Live class not found" });
    const c = await LiveClass.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Live class not found" });
    const enrolled = await Enrollment.exists({
      course: c.course,
      student: req.user._id,
    });
    const isHost =
      req.user.role === "admin" ||
      String(c.instructor) === String(req.user._id);
    if (!enrolled && !isHost)
      return res
        .status(403)
        .json({ message: "Enroll in the course to view the chat" });
    const messages = await ChatMessage.find({ roomName: c.roomName })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();
    res.json({ messages });
  } catch (e) {
    next(e);
  }
});

// Runs before multer so a non-moderator cannot push bytes to disk. A promoted
// co-host can hold the student role, so the class document is the authority.
const canUploadRecording = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "Live class not found" });
    const c = await LiveClass.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Live class not found" });
    const isMod =
      req.user.role === "admin" ||
      String(c.instructor) === String(req.user._id) ||
      (c.cohosts || []).some((x) => String(x) === String(req.user._id));
    if (!isMod)
      return res
        .status(403)
        .json({ message: "Only the host or a co-host can upload a recording" });
    req.liveClass = c;
    next();
  } catch (e) {
    next(e);
  }
};

r.post(
  "/classes/:id/recording",
  auth,
  canUploadRecording,
  upload.single("recording"),
  async (req, res, next) => {
    try {
      const c = req.liveClass;
      if (!req.file)
        return res.status(400).json({ message: "recording file is required" });
      const url = publicUploadUrl(req.file.filename);
      c.recordings.push({
        url,
        uploadedBy: req.user._id,
        sizeMb: Math.round(req.file.size / 104857.6) / 10,
      });
      if (!c.recordingUrl) c.recordingUrl = url;
      await c.save();
      await notifyEnrolledStudents(c.course, {
        type: "live_class",
        title: "Class recording is ready",
        body: `"${c.title}" recording is now available.`,
        link: "/live",
      });
      res
        .status(201)
        .json({
          recording: {
            url,
            sizeMb: req.file.size
              ? Math.round(req.file.size / 104857.6) / 10
              : 0,
          },
        });
    } catch (e) {
      next(e);
    }
  },
);

export default r;

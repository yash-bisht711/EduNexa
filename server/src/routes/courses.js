import { Router } from "express";
import { Course, Enrollment, User } from "../models/index.js";
import { auth, allow } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getVideoQueue } from "../services/videoQueue.js";
import { publicUploadUrl } from "../services/storage.js";
import { notifyEnrolledStudents, notifyStudents } from "../services/notify.js";
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
r.get("/", async (req, res, next) => {
  try {
    const {
      search,
      level,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;
    const q = { published: true };
    if (search)
      q.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    if (level) q.level = level;
    if (category) q.category = category;
    if (minPrice !== undefined || maxPrice !== undefined) {
      q.price = {};
      if (minPrice !== undefined) q.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) q.price.$lte = Number(maxPrice);
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const [items, total] = await Promise.all([
      Course.find(q)
        .populate("instructor", "name")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Course.countDocuments(q),
    ]);
    res.json({
      courses: items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (e) {
    next(e);
  }
});
r.get("/:id", async (req, res, next) => {
  try {
    const c = await Course.findById(req.params.id).populate(
      "instructor",
      "name",
    );
    if (!c) return res.status(404).json({ message: "Course not found" });
    res.json({ course: c });
  } catch (e) {
    next(e);
  }
});
r.post("/", auth, allow("instructor", "admin"), async (req, res, next) => {
  try {
    const c = await Course.create({ ...req.body, instructor: req.user._id });
    if (c.published)
      await notifyStudents({
        type: "new_course",
        title: "New course available",
        body: `"${c.title}" is now available.`,
        link: `/course/${c._id}`,
      });
    res.status(201).json({ course: c });
  } catch (e) {
    next(e);
  }
});
r.patch("/:id", auth, allow("instructor", "admin"), async (req, res, next) => {
  try {
    const c = await Course.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Course not found" });
    if (
      req.user.role !== "admin" &&
      String(c.instructor) !== String(req.user._id)
    )
      return res.status(403).json({ message: "Not your course" });
    const wasPublished = c.published;
    const changedContent = [
      "title",
      "description",
      "category",
      "level",
      "thumbnail",
      "price",
    ].some(
      (key) =>
        Object.prototype.hasOwnProperty.call(req.body, key) &&
        String(c[key] ?? "") !== String(req.body[key] ?? ""),
    );
    Object.assign(c, req.body);
    await c.save();
    if (!wasPublished && c.published)
      await notifyStudents({
        type: "new_course",
        title: "New course available",
        body: `"${c.title}" is now available.`,
        link: `/course/${c._id}`,
      });
    else if (wasPublished && changedContent)
      await notifyEnrolledStudents(c._id, {
        type: "course_update",
        title: "Course updated",
        body: `"${c.title}" has been updated.`,
        link: `/course/${c._id}`,
      });
    res.json({ course: c });
  } catch (e) {
    next(e);
  }
});
r.delete("/:id", auth, allow("instructor", "admin"), async (req, res, next) => {
  try {
    const c = await Course.findById(req.params.id);
    if (!c) return res.status(404).json({ message: "Course not found" });
    if (
      req.user.role !== "admin" &&
      String(c.instructor) !== String(req.user._id)
    )
      return res.status(403).json({ message: "Not your course" });
    await c.deleteOne();
    res.json({ message: "Course deleted" });
  } catch (e) {
    next(e);
  }
});
r.patch(
  "/:id/lessons/reorder",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const c = await Course.findById(req.params.id);
      if (!c) return res.status(404).json({ message: "Course not found" });
      if (
        req.user.role !== "admin" &&
        String(c.instructor) !== String(req.user._id)
      )
        return res.status(403).json({ message: "Not your course" });
      const { order } = req.body;
      if (!Array.isArray(order))
        return res
          .status(400)
          .json({ message: "order must be an array of lesson IDs" });
      const lessonMap = new Map(c.lessons.map((l) => [String(l._id), l]));
      const reordered = order
        .filter((id) => lessonMap.has(id))
        .map((id, i) => {
          const l = lessonMap.get(id);
          l.order = i + 1;
          return l;
        });
      c.lessons = reordered;
      await c.save();
      res.json({ course: c });
    } catch (e) {
      next(e);
    }
  },
);
r.post("/:id/enroll", auth, allow("student"), async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course || !course.published)
      return res.status(404).json({ message: "Course unavailable" });
    if (course.price > 0)
      return res
        .status(402)
        .json({
          message: "This is a paid course. Complete checkout before enrolling.",
        });
    const e = await Enrollment.findOneAndUpdate(
      { student: req.user._id, course: course._id },
      {
        $setOnInsert: {
          student: req.user._id,
          course: course._id,
          paid: course.price === 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json({ enrollment: e });
  } catch (e) {
    next(e);
  }
});
r.post(
  "/:id/lessons",
  auth,
  allow("instructor", "admin"),
  async (req, res, next) => {
    try {
      const c = await Course.findById(req.params.id);
      if (!c) return res.status(404).json({ message: "Course not found" });
      if (
        req.user.role !== "admin" &&
        String(c.instructor) !== String(req.user._id)
      )
        return res.status(403).json({ message: "Not your course" });
      c.lessons.push(req.body);
      await c.save();
      if (c.published)
        await notifyEnrolledStudents(c._id, {
          type: "course_update",
          title: "New lesson added",
          body: `A new lesson was added to "${c.title}".`,
          link: `/course/${c._id}`,
        });
      res.status(201).json({ course: c });
    } catch (e) {
      next(e);
    }
  },
);
r.post(
  "/lessons/:lessonId/upload",
  auth,
  allow("instructor", "admin"),
  upload.single("video"),
  async (req, res, next) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "Video file is required" });
      const course = await Course.findOne({
        "lessons._id": req.params.lessonId,
      });
      if (!course) return res.status(404).json({ message: "Lesson not found" });
      if (
        req.user.role !== "admin" &&
        String(course.instructor) !== String(req.user._id)
      )
        return res.status(403).json({ message: "Not your course" });
      const lesson = course.lessons.id(req.params.lessonId);
      lesson.videoUrl = publicUploadUrl(req.file.filename);
      await course.save();
      if (course.published)
        await notifyEnrolledStudents(course._id, {
          type: "course_video",
          title: "New video available",
          body: `A new video is available in "${course.title}".`,
          link: `/course/${course._id}`,
        });
      let queued = false;
      const q = getVideoQueue();
      if (q) {
        try {
          await q.add("transcode", {
            inputPath: req.file.path,
            lessonId: String(lesson._id),
            courseId: String(course._id),
            filename: req.file.filename,
          });
          queued = true;
        } catch (e) {
          console.warn("Queue unavailable:", e.message);
        }
      }
      res
        .status(201)
        .json({
          message: queued
            ? "Video uploaded and queued for HLS processing"
            : "Video uploaded; transcoding queue unavailable",
          videoUrl: lesson.videoUrl,
          queued,
        });
    } catch (e) {
      next(e);
    }
  },
);
export default r;

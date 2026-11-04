import { Notification, Enrollment, User } from "../models/index.js";
import { getIo } from "../sockets/index.js";

export async function notifyUsers(userIds, { type, title, body = "", link = "" }) {
  const ids = [...new Set(userIds.map(String).filter(Boolean))];
  if (!ids.length) return [];
  let docs = [];
  try {
    docs = await Notification.insertMany(
      ids.map((user) => ({ user, type, title, body, link })),
    );
  } catch (e) {
    console.warn("notifyUsers failed:", e.message);
    return [];
  }
  const io = getIo();
  if (io) {
    for (const doc of docs) {
      io.to(`user:${doc.user}`).emit("notification:new", {
        _id: String(doc._id),
        type: doc.type,
        title: doc.title,
        body: doc.body,
        link: doc.link,
        read: false,
        createdAt: doc.createdAt,
      });
    }
  }
  return docs;
}

export async function notifyEnrolledStudents(courseId, payload, excludeIds = []) {
  const { Enrollment } = await import("../models/index.js");
  const rows = await Enrollment.find({ course: courseId }).select("student");
  const skip = new Set(excludeIds.map(String));
  const ids = rows.map((r) => String(r.student)).filter((id) => !skip.has(id));
  return notifyUsers(ids, payload);
}

export async function notifyStudents(payload) {
  const students = await User.find({ role: "student" }).select("_id");
  return notifyUsers(students.map((student) => String(student._id)), payload);
}

// server/src/services/liveScheduler.js
// Polls LiveClass docs every 30s:
//  - reminder 10 min before start -> notify enrolled students
//  - scheduled -> live at startsAt (auto open) -> notify enrolled students
//  - live -> ended at endsAt (auto close)
import { LiveClass } from "../models/index.js";
import { notifyEnrolledStudents, notifyUsers } from "./notify.js";
import { forceClassStatus } from "../sockets/index.js";

const REMINDER_WINDOW_MS = 10 * 60 * 1000;
const TICK_MS = 30 * 1000;

async function tick() {
  const now = Date.now();
  try {
    const upcoming = await LiveClass.find({
      status: "scheduled",
      startsAt: { $ne: null },
    });
    for (const cls of upcoming) {
      const starts = new Date(cls.startsAt).getTime();
      if (!cls.reminderSentAt && now >= starts - REMINDER_WINDOW_MS && now < starts) {
        await notifyEnrolledStudents(cls.course, {
          type: "live_class",
          title: "Live class starting soon",
          body: `"${cls.title}" starts at ${new Date(cls.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Get ready to join!`,
          link: `/live?join=${cls._id}`,
        });
        cls.reminderSentAt = new Date();
        await cls.save();
      } else if (now >= starts) {
        await forceClassStatus(cls._id, "live");
        await notifyEnrolledStudents(cls.course, {
          type: "live_class",
          title: "Live class is now streaming",
          body: `"${cls.title}" is live. Join the room now!`,
          link: `/live?join=${cls._id}`,
        });
      }
    }

    const overdue = await LiveClass.find({
      status: "live",
      endsAt: { $ne: null, $lte: new Date() },
    });
    for (const cls of overdue) {
      await forceClassStatus(cls._id, "ended");
      if (cls.instructor) {
        await notifyUsers([cls.instructor], {
          type: "live_class",
          title: "Session ended",
          body: `"${cls.title}" has ended automatically at its scheduled time.`,
          link: "/live",
        });
      }
    }
  } catch (e) {
    console.warn("liveScheduler tick failed:", e.message);
  }
}

let started = false;
export function startLiveScheduler() {
  if (started) return;
  started = true;
  void tick();
  setInterval(tick, TICK_MS);
}

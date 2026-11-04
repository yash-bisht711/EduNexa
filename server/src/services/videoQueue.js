// import { Queue } from "bullmq";
// import IORedis from "ioredis";
// let queue = null;
// export function getVideoQueue() {
//   if (!process.env.REDIS_URL) return null;
//   try {
//     if (!queue) {
//       const connection = new IORedis(process.env.REDIS_URL, {
//         maxRetriesPerRequest: null,
//         lazyConnect: true,
//       });
//       connection.on("error", (e) =>
//         console.warn("Redis queue error:", e.message),
//       );
//       queue = new Queue("video-transcoding", { connection });
//     }
//     return queue;
//   } catch {
//     return null;
//   }
// }


import { Queue } from "bullmq";
import IORedis from "ioredis";

let queue = null;
let connection = null;

export function getVideoQueue() {
  try {
    if (!queue) {
      const redisUrl =
        process.env.REDIS_URL || "redis://127.0.0.1:6379";

      connection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
      });

      connection.on("connect", () => {
        console.log("Video queue Redis connected");
      });

      connection.on("error", (error) => {
        console.error("Redis queue error:", error.message);
      });

      queue = new Queue("video-transcoding", {
        connection,
      });

      queue.on("error", (error) => {
        console.error("Video queue error:", error.message);
      });
    }

    return queue;
  } catch (error) {
    console.error("Queue initialization failed:", error.message);
    return null;
  }
}

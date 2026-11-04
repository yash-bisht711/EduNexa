import "dotenv/config";
import { Worker } from "bullmq";
import ffmpegPath from "ffmpeg-static";
import IORedis from "ioredis";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { Course } from "../models/index.js";
const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null },
);
connection.on("error", (e) => console.warn("Worker Redis error:", e.message));
const root = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads");
const ffmpegBinary = process.env.FFMPEG_PATH || ffmpegPath;

if (!ffmpegBinary) {
  throw new Error("FFmpeg executable not found. Install ffmpeg-static.");
}

console.log("Using FFmpeg:", ffmpegBinary);
// function transcode(input, outDir) {
//   return new Promise((resolve, reject) => {
//     fs.mkdirSync(outDir, { recursive: true });
//     const out = path.join(outDir, "index.m3u8");
//     const p = spawn("ffmpeg", [
//       "-y",
//       "-i",
//       input,
//       "-codec:v",
//       "libx264",
//       "-codec:a",
//       "aac",
//       "-hls_time",
//       "6",
//       "-hls_playlist_type",
//       "vod",
//       "-hls_segment_filename",
//       path.join(outDir, "segment_%03d.ts"),
//       out,
//     ]);
//     let err = "";
//     p.stderr.on("data", (d) => (err += d));
//     p.on("close", (code) =>
//       code === 0
//         ? resolve(out)
//         : reject(new Error(`FFmpeg failed (${code}): ${err.slice(-1000)}`)),
//     );
//   });
// }

function transcode(input, outDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(input)) {
      return reject(new Error(`Input video not found: ${input}`));
    }

    fs.mkdirSync(outDir, { recursive: true });

    const output = path.join(outDir, "index.m3u8");

    console.log("Starting FFmpeg:", ffmpegBinary);
    console.log("Input video:", input);

    const process = spawn(ffmpegBinary, [
      "-y",
      "-i", input,
      "-codec:v", "libx264",
      "-codec:a", "aac",
      "-hls_time", "6",
      "-hls_playlist_type", "vod",
      "-hls_segment_filename",
      path.join(outDir, "segment_%03d.ts"),
      output,
    ]);

    let errorOutput = "";

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("error", (error) => {
      reject(new Error(`Unable to start FFmpeg: ${error.message}`));
    });

    process.on("close", (code) => {
      if (code === 0) {
        console.log("FFmpeg transcoding completed:", output);
        resolve(output);
      } else {
        reject(
          new Error(
            `FFmpeg failed (${code}): ${errorOutput.slice(-2000)}`
          )
        );
      }
    });
  });
}

const worker = new Worker(
  "video-transcoding",
  async (job) => {
    const { inputPath, lessonId, courseId, filename } = job.data;
    const outDir = path.join(root, "hls", filename);
    const playlist = await transcode(inputPath, outDir);
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/edunexa",
    );
    const c = await Course.findById(courseId);
    const l = c?.lessons.id(lessonId);
    if (l) {
      l.hlsUrl = `/uploads/hls/${filename}/index.m3u8`;
      await c.save();
    }
    await mongoose.disconnect();
    return { playlist };
  },
  { connection, concurrency: 2 },
);
worker.on("completed", (j) => console.log(`Transcoded ${j.id}`));
worker.on("failed", (j, e) =>
  console.error(`Transcode failed ${j?.id}:`, e.message),
);
console.log("EduNexa FFmpeg worker listening");

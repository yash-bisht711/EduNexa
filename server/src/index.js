import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import learningRoutes from "./routes/learning.js";
import liveRoutes from "./routes/live.js";
import financeRoutes from "./routes/finance.js";
import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/ai.js";
import organizationRoutes from "./routes/organizations.js";
import reviewRoutes from "./routes/reviews.js";
import notificationRoutes from "./routes/notifications.js";
import { notFound, errors } from "./middleware/errors.js";
import { attachSockets } from "./sockets/index.js";
import { startLiveScheduler } from "./services/liveScheduler.js";
const app = express();
const server = http.createServer(app);
// const clientOrigins = (process.env.CLIENT_URL || "http://localhost:5174").split(
//   ",",
// );
// app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// const allowedOrigins = [
//   "http://localhost:5174",
//   "http://127.0.0.1:5174",
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // Allow requests without an Origin header (e.g. Postman)
//       if (!origin || allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       }

//       return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

const clientOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from Postman and server-to-server calls.
      if (!origin || clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Not allowed by CORS: ${origin}`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const uploadDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "uploads",
);
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));
const openapi = {
  openapi: "3.0.0",
  info: {
    title: "EduNexa API",
    version: "1.0.0",
    description: "EduNexa LMS REST API. Authenticate with a Bearer JWT.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { 200: { description: "Healthy" } },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        responses: { 200: { description: "JWT and user" } },
      },
    },
    "/courses": {
      get: {
        summary: "List published courses",
        responses: { 200: { description: "Course list" } },
      },
      post: {
        summary: "Create course",
        responses: { 201: { description: "Created" } },
      },
    },
    "/ai/chat": {
      post: {
        summary: "Send a message to the authenticated learner AI coach",
        responses: {
          200: { description: "AI response and conversation ID" },
          503: { description: "AI provider not configured" },
        },
      },
    },
    "/ai/study-plan": {
      get: {
        summary: "Generate a personalized 7-day study plan",
        responses: { 200: { description: "Study plan" } },
      },
    },
    "/organizations": {
      get: { summary: "List organizations for the current user" },
      post: { summary: "Create an organization" },
    },
  },
};
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    app: "EduNexa API",
    time: new Date().toISOString(),
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api/courses/:courseId/reviews", reviewRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/me", learningRoutes);
app.use("/api/live", liveRoutes);
app.use("/api", financeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use(notFound);
app.use(errors);
attachSockets(server, clientOrigins);
const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    startLiveScheduler();
    server.listen(PORT, () =>
      console.log(`EduNexa API running on http://localhost:${PORT}`),
    );
  })
  .catch((e) => {
    console.error("Database connection failed:", e.message);
    process.exit(1);
  });

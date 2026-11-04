# EduNexa — Engineering Reflection & Ownership Report

> **Project:** EduNexa Next-Gen Learning Management System  
> **Specialization Track:** Full-Stack Web Development  
> **Batch Date:** October 2026 – November 2026  
> **Author:** Yash (Full-Stack Engineering Intern)

---

## 1. What I Owned (Key Responsibilities & Deliverables)

During this project, I owned the end-to-end design, implementation, and hardening of the core LMS platform:

### 1.1 Backend & Architecture
- **Schema & Data Modeling:** Designed the MongoDB schemas for Users, Courses, Lessons, Enrollments, Quizzes, QuizAttempts, LiveClasses, Payments, Reviews, Notifications, AIConversations, and Organizations.
- **Asynchronous Video Pipeline:** Architected the BullMQ Redis queue that receives raw uploaded video files and offloads them to an FFmpeg worker to transcode into adaptive HLS (m3u8 playlist + 6s ts video segments).
- **Security & Authorization Middleware:** Implemented role-based access control (`student`, `instructor`, `admin`) with stateless JWT authentication, rate limiting, and parameter validation.
- **Real-Time Live Classes & Signaling:** Configured Socket.IO for classroom signaling, room-level join/leave lifecycle, live status transitions (`scheduled` → `live` → `ended`), and real-time messaging, alongside LiveKit token issuance for WebRTC media plane connectivity.
- **Financial Dashboard & Payment Flows:** Developed the Razorpay order creation and HMAC-SHA256 signature verification endpoints, plus monthly aggregation queries for instructor revenue analytics.
- **Automated Certification:** Engineered the vector PDF generation service using `PDFKit` that dynamically drafts custom certificates with student names, courses, instructor validation, and verification hashes.

### 1.2 Frontend & UI Architecture
- **Component Decomposition:** Refactored a monolithic 1,000+ line `App.jsx` into modular components (`Layout`, `VideoPlayer`, `StarRating`, `ToastProvider`, and dedicated page modules for each functional area).
- **HLS Video Streaming Player:** Built a custom video player featuring native HLS/MP4 playback, keyboard shortcuts, scrubber, playback speed adjustments (0.75x–2x), volume control, and auto-lesson advance.
- **Interactive Quiz Engine:** Created a user-friendly assessment interface featuring question progress indicators, instant server-side auto-grading, answer explanations, score percentages, and retake workflows.
- **Superadmin Administration Suite:** Built an administrative portal with tabbed views for platform KPI overviews, user role management, course visibility toggles (publish/unpublish), and audit logs.
- **Nexa AI Learning Coach:** Designed the conversational tutor interface connected to Gemini/OpenAI with contextual study suggestions and automated 7-day personalized study schedule generation.

---

## 2. Key Technical Challenges & Solutions

### Challenge 1: Video Transcoding Bottlenecks
- **Problem:** Processing high-resolution video directly inside HTTP request handlers causes server freezes and request timeouts.
- **Solution:** Decoupled uploads from transcoding using BullMQ and Redis. When a video is uploaded via Multer, the file is immediately saved, a lightweight job is queued, and the HTTP request returns `201 Accepted`. The standalone background worker (`videoWorker.js`) handles FFmpeg slicing without interrupting API response times.

### Challenge 2: Secure Assessment Integrity
- **Problem:** If correct quiz answers or points are sent to the client, tech-savvy students can inspect the DOM or network tab to obtain answers before submitting.
- **Solution:** Enforced strict server-side grading. The `GET /api/me/quizzes/:id` route strips `correctIndex` and `explanation` from the payload. Scoring is strictly calculated on the server during `POST /api/me/quizzes/:id/submit`, and explanations are only returned post-submission.

### Challenge 3: Maintaining Real-Time State Across Heterogeneous Users
- **Problem:** Students and instructors need immediate notification when a class starts or when new announcements occur, without polling the database.
- **Solution:** Implemented room-based Socket.IO communication. Sockets authenticate via JWT during handshake, join specific room channels (`edunexa-<timestamp>-<hash>`), and broadcast state changes instantly.

---

## 3. What I Learned

1. **Distributed Asynchronous Processing:** Mastered message queue patterns using BullMQ and Redis to separate CPU-intensive operations (FFmpeg encoding) from I/O-bound web processes.
2. **Media Streaming Architectures:** Gained deep knowledge of HLS (HTTP Live Streaming), `.m3u8` playlist structures, and content delivery strategies using CloudFront and S3.
3. **Enterprise Tenancy Modeling:** Learned how to establish multi-tenant organizational hierarchies where learners and instructors belong to shared workspaces with isolated role definitions.
4. **Resilient Production Design:** Learned the value of fallback designs — ensuring that if third-party services (LiveKit, Razorpay, or Gemini) lack live API keys in local development, the platform gracefully degrades to demo modes with zero crash states.

---

## 4. What I Would Do Differently Next Time

- **Micro-frontends or Next.js App Router:** For an application with this breadth, adopting Next.js with Server Components could further reduce bundle sizes and enable server-rendered SEO for course catalogues.
- **Automated E2E Testing:** While unit tests cover the logic contracts, adding Playwright for full end-to-end browser testing from registration to video playback would provide even stronger guarantees.
- **Webhook Replay Architecture:** Integrate dedicated dead-letter queues (DLQ) for payment webhooks to handle intermittent gateway downtime automatically.

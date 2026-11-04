# EduNexa — 10-Minute Final Presentation Script

> **Topic:** EduNexa: Next-Generation Learning Management System with Live Classes  
> **Presenter:** Yash (Full-Stack Engineering Intern)  
> **Audience:** Technical Leadership, Mentors, and Hiring Committee  
> **Duration:** 10 Minutes Total

---

## Slide 1: Problem Statement & Vision (Minute 0:00 – 1:00)

- **The Problem:** Modern online learners face fragmented experiences — watching pre-recorded courses on one platform, attending live workshops on Zoom, submitting quizzes on Google Forms, and managing credentials on LinkedIn. Instructors deal with complex payout tracking and clunky video uploading.
- **The EduNexa Vision:** A unified, AI-first EdTech SaaS platform combining on-demand video learning, real-time interactive classrooms, auto-graded assessments, verified digital certificates, and instructor monetization in a single cohesive platform.

---

## Slide 2: Target Audience & Role Architecture (Minute 1:00 – 2:00)

- **Three Core User Personas:**
  1. **Learners:** Browse catalog, watch HLS streaming video, complete quizzes, join live classes, converse with Nexa AI coach, and download verifiable PDF certificates.
  2. **Instructors:** Author curriculum, upload raw video, trigger automated FFmpeg HLS transcoding, schedule live sessions, and track real-time revenue analytics.
  3. **Platform Superadmins:** Manage user roles, moderate courses, toggle visibility, and audit payments.
  4. **Organizations / B2B:** Cohort-based learning spaces with dedicated workspace admins.

---

## Slide 3: System Architecture & Tech Stack (Minute 2:00 – 3:30)

- **Frontend:** React 18, Vite 6, Redux Toolkit, Tailwind CSS, Lucide React, Socket.IO Client.
- **Backend API:** Node.js 20+, Express.js 4, Mongoose 8, JWT Authentication, Helmet security, rate limiting.
- **Data Stores:** MongoDB (Source of Truth), Redis 7 (BullMQ Job Queuing).
- **Media Plane:** BullMQ asynchronous queue offloading to an FFmpeg worker to encode HLS (`.m3u8` playlists + `.ts` segments) with CloudFront CDN integration seams.
- **Real-Time Plane:** Socket.IO for encrypted room signaling and live classroom chat, with LiveKit server SDK token minting.
- **Fintech & Docs:** Razorpay test mode integration with HMAC-SHA256 signature verification; PDFKit for certificate generation.

---

## Slide 4: End-to-End Live Demo Walkthrough (Minute 3:30 – 6:30)

1. **Authentication & Student Experience:**
   - Sign in as `student@edunexa.dev`.
   - Explore courses with instant debounced search and level filtering.
   - Enroll in *Full Stack Web Development*.
2. **Video Streaming & Classroom:**
   - Watch lessons in custom player with playback speed and scrubber controls.
   - Show automatic progress calculation as lessons are marked complete.
3. **Assessment Engine:**
   - Take the knowledge check quiz.
   - Show instant server-side auto-grading with question explanations.
4. **Credentialing:**
   - Reach 100% completion and trigger one-click PDF certificate download with verification ID.
5. **Real-Time Live Class:**
   - Enter scheduled live room with camera/mic controls and live Socket.IO messaging.
6. **Instructor Studio & Revenue:**
   - Switch to `instructor@edunexa.dev`.
   - Show Course Studio, video upload, and monthly revenue bar chart.

---

## Slide 5: Key Technical Challenges & Solutions (Minute 6:30 – 8:00)

- **Challenge 1: Non-Blocking Video Transcoding:**
  - *Solution:* Used BullMQ queue in Redis to decouple upload from FFmpeg processing. The API responds instantly while background workers process high-definition video chunks.
- **Challenge 2: Assessment Security & Anti-Cheat:**
  - *Solution:* Quiz answers and explanations are never sent to the client until the student's submission is verified and scored server-side.
- **Challenge 3: Graceful Degradation in Local Environments:**
  - *Solution:* Handled optional third-party integrations (LiveKit, Razorpay, Gemini) with fallbacks (Socket.IO signaling, test payment stubs) so developers can run the entire platform with zero external paid subscriptions.

---

## Slide 6: Results, Test Metrics & Verification (Minute 8:00 – 9:00)

- **Automated Test Results:** **18 / 18 tests passing (100% success rate)** via Node.js native test runner.
- **Frontend Quality:** Vite production build compiles in **22 seconds with zero errors** and a compact **136 kB gzipped bundle**.
- **Performance Benchmarks:**
  - API Health Check: < 5ms
  - Course List API: ~18ms
  - PDF Certificate Generation: ~108ms
  - Quiz Auto-grading: ~12ms

---

## Slide 7: Next Steps & Roadmap (Minute 9:00 – 10:00)

- **Production Cloud Deployment:** S3 private bucket with CloudFront signed URLs for media protection.
- **LiveKit Cloud SFU Deployment:** Scalable multi-party video streaming for large classes (>100 participants).
- **Payment Webhook Reconciliation:** Automatic payment retry queues and automated instructor bank payouts.
- **Enterprise Multi-Tenancy:** Hard multi-tenant database partitioning across organization workspaces.

---

## Q&A Preparation / Common Questions

- **Q: Why BullMQ instead of processing videos directly?**  
  *A: FFmpeg is CPU and memory intensive. Direct execution blocks Node.js event loops and causes HTTP request timeouts. BullMQ provides concurrency control, retries, and persistence.*
- **Q: How are certificates verified?**  
  *A: Each certificate encodes a verification URL containing the unique course and student IDs (`/verify/:courseId-:studentId`), which cross-references the enrollment completion status in MongoDB.*
- **Q: How does the AI tutor maintain academic integrity?**  
  *A: The system prompt instructs Nexa to guide learners conceptually through problems rather than providing direct answers to active graded tests.*

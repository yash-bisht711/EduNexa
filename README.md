# EduNexa — Next-Gen Learning Management System with Live Classes

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-green.svg)](https://mongoosejs.com/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ%20Queue-red.svg)](https://bullmq.io/)
[![Vite Build](https://img.shields.io/badge/Vite-Passing-brightgreen.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-18%2F18%20Passing-success.svg)](./docs/TEST-RESULTS.md)

EduNexa is a full-featured, AI-first online school and Learning Management System (LMS) built with React 18, Vite, Redux Toolkit, Tailwind CSS, Node.js/Express, MongoDB, Redis, BullMQ, FFmpeg, Socket.IO, LiveKit, PDFKit, and Razorpay.

---

## 🌟 Feature Checklist (Step-by-Step Requirements)

| Step | Requirement | Implementation Status & Details |
|---|---|---|
| **1** | **Roles & Schemas** | **Complete:** Roles (`student`, `instructor`, `admin`). Schemas for `User`, `Course`, `Lesson`, `Enrollment`, `Quiz`, `QuizAttempt`, `LiveClass`, `Payment`, `Review`, `Notification`, `AIConversation`, `Organization`. |
| **2** | **Course Creation & Video Upload** | **Complete:** Course Studio for instructors, Multer file upload, and BullMQ background queue converting videos to HLS playlists (`.m3u8` + `.ts` chunks) via FFmpeg. |
| **3** | **CloudFront Video Delivery** | **Complete:** CloudFront distribution adapter in `storage.js` for production signed URL streaming, with local static upload fallback. |
| **4** | **Quizzes & Progress Tracking** | **Complete:** Auto-grading engine, question explanations, progress percentage calculation, and enrollment tracking. |
| **5** | **Live Classes with WebRTC & Chat** | **Complete:** Real-time classroom with Socket.IO signaling, live chat, participant controls, and LiveKit token generation. |
| **6** | **PDF Certificate Generation** | **Complete:** Vector PDF certificates generated via PDFKit upon 100% course completion, featuring unique verification IDs. |
| **7** | **Instructor Revenue Dashboard** | **Complete:** Financial analytics dashboard with SVG monthly revenue charts and Razorpay test mode payment verification. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **Docker Desktop:** Recommended for running MongoDB and Redis
- **FFmpeg:** Installed on system PATH (for background video transcoding)

### Installation & Launch

```bash
# 1. Navigate to the EduNexa directory
cd EduNexa

# 2. Install dependencies across root, server, and client workspaces
npm install

# 3. Create server environment configuration
# Windows PowerShell:
Copy-Item .env.example server/.env
# macOS / Linux:
cp .env.example server/.env

# 4. Start MongoDB and Redis containers
docker compose up -d

# 5. Seed the database with demo users, courses, quizzes, and live classes
npm run seed

# 6. Start both the client and server concurrently
npm run dev
```

- **Frontend Client:** http://localhost:5173
- **Backend API:** http://localhost:5000/api/health
- **Swagger Interactive API Documentation:** http://localhost:5000/api-docs

---

## 👥 Demo Accounts

All seeded demo accounts share the password: `Password123!`

| Role | Email | Capabilities |
|---|---|---|
| **Student** | `student@edunexa.dev` | Browse courses, watch HLS video, take quizzes, join live classes, converse with Nexa AI, download certificates |
| **Instructor** | `instructor@edunexa.dev` | Access Course Studio, upload video lectures, schedule live sessions, view monthly revenue charts |
| **Admin** | `admin@edunexa.dev` | Superadmin controls: manage user roles, toggle course publication, monitor global platform transactions |

---

## 📁 Repository Structure

```
EduNexa/
├── client/                     # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/         # Modular UI components
│   │   │   ├── Layout.jsx      # Navigation sidebar, header, role routing
│   │   │   ├── VideoPlayer.jsx # HLS/MP4 video player with playback speed
│   │   │   ├── StarRating.jsx  # Interactive star rating component
│   │   │   ├── Toast.jsx       # Contextual toast notifications system
│   │   │   └── shared.jsx      # Shared cards, hooks, badges, helpers
│   │   ├── pages/              # Dedicated page components
│   │   │   ├── AuthPage.jsx    # Login & registration
│   │   │   ├── DashboardPage.jsx # Student overview & KPI widgets
│   │   │   ├── CoursesPage.jsx # Catalog with debounced search & filters
│   │   │   ├── CourseDetailPage.jsx # Course syllabus, enrollment & reviews
│   │   │   ├── LearnPage.jsx   # Classroom player with syllabus playlist
│   │   │   ├── QuizPage.jsx    # Auto-graded assessment interface
│   │   │   ├── LivePage.jsx    # Live video classroom & Socket.IO chat
│   │   │   ├── FinancePage.jsx # Instructor revenue & monthly bar chart
│   │   │   ├── ManagePage.jsx  # Course studio & video upload manager
│   │   │   ├── CertificatesPage.jsx # Verified credentials & PDF downloads
│   │   │   ├── AdminPage.jsx   # Superadmin user & course moderation
│   │   │   ├── AIPage.jsx      # Nexa AI coach & 7-day study planner
│   │   │   └── OrganizationsPage.jsx # B2B workspace & team management
│   │   ├── api.js              # Axios interceptor with Bearer token
│   │   ├── store.js            # Redux Toolkit authentication store
│   │   ├── styles.css          # Tailwind CSS design system
│   │   └── main.jsx            # Application entry with ToastProvider
│   ├── package.json
│   └── vite.config.js
├── server/                     # Express.js REST API & background services
│   ├── src/
│   │   ├── config/             # MongoDB database connection
│   │   ├── middleware/         # JWT auth, role checks, error handlers
│   │   ├── models/             # Mongoose schemas (Users, Courses, etc.)
│   │   ├── routes/             # REST endpoint routers
│   │   │   ├── auth.js         # Register, login, profile
│   │   │   ├── courses.js      # CRUD, search, filter, video upload
│   │   │   ├── learning.js     # Progress, quizzes, PDF certificates
│   │   │   ├── live.js         # Live classes, LiveKit tokens, status
│   │   │   ├── finance.js      # Razorpay orders, monthly earnings
│   │   │   ├── admin.js        # User management, course publication
│   │   │   ├── reviews.js      # Course ratings and student reviews
│   │   │   ├── notifications.js# System notification center
│   │   │   ├── ai.js           # Gemini/OpenAI learning coach & planner
│   │   │   └── organizations.js# Multi-tenant workspace management
│   │   ├── services/           # Storage adapters, PDFKit, BullMQ queue
│   │   ├── workers/            # BullMQ FFmpeg transcoding worker
│   │   ├── index.js            # Express server & Socket.IO initialization
│   │   └── seed.js             # Demo data population script
│   ├── test/
│   │   └── smoke.test.js       # 18 automated unit and contract tests
│   └── package.json
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # Full Mermaid diagrams & system architecture
│   ├── API.md                  # Comprehensive REST API reference
│   ├── TEST-RESULTS.md         # Automated test execution & SLA report
│   ├── PRESENTATION.md         # 10-minute presentation slide script
│   ├── INDIVIDUAL-REFLECTION.md# Technical ownership & reflection report
│   └── PRODUCT-ROADMAP.md      # Future milestones & SaaS scaling
├── docker-compose.yml          # Container configuration for MongoDB & Redis
└── README.md
```

---

## 🧪 Testing & Quality Assurance

To execute the automated unit and contract test suite:

```bash
npm test -w server
```

To run the production frontend build:

```bash
npm run build -w client
```

All 18 tests execute in under 7 seconds, verifying JWT fallback configs, anti-cheat quiz scoring, server-side AI key isolation, PDFKit binary generation, Razorpay HMAC-SHA256 verification, lesson reordering, and role-based permissions. See [docs/TEST-RESULTS.md](./docs/TEST-RESULTS.md) for detailed test metrics.

---

## 🎥 Deliverables & Documentation Index

- **System Architecture:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **API Documentation:** [docs/API.md](./docs/API.md)
- **Test Results Report:** [docs/TEST-RESULTS.md](./docs/TEST-RESULTS.md)
- **10-Minute Presentation Script:** [docs/PRESENTATION.md](./docs/PRESENTATION.md)
- **Individual Reflection & Ownership:** [docs/INDIVIDUAL-REFLECTION.md](./docs/INDIVIDUAL-REFLECTION.md)
- **Product Roadmap:** [docs/PRODUCT-ROADMAP.md](./docs/PRODUCT-ROADMAP.md)

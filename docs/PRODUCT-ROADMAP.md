# EduNexa Product Strategy & Roadmap

## Positioning
EduNexa is a hybrid, AI-first learning platform for individual learners, independent instructors, training institutes, colleges and company learning teams. The first release is a modular monolith: one deployable API with domain modules and clear boundaries. This keeps development practical for a small team while leaving room to extract services when scale and operational evidence justify it.

## Product pillars

1. **Learn** — course discovery, enrollment, lessons, quizzes, progress, certificates.
2. **Studio** — instructor course authoring, lessons, video processing, batches, learner insights and earnings.
3. **Live** — scheduled classrooms, chat, attendance and managed media via LiveKit.
4. **AI** — contextual learning coach, saved conversations and personalized study plans. Gemini or OpenAI can be configured server-side; keys must never reach the browser.
5. **Career (next milestone)** — skill assessments, projects, interview practice, portfolio and opportunity tracking.
6. **Enterprise (foundation included)** — organizations, memberships and organization-level roles. Next: tenant-scoped course catalogs, cohorts, SSO, audit logs, custom domains and billing.

## Release milestones

### Release 1 — Internship-ready core
- [x] Student, instructor and platform-admin roles
- [x] Course catalog, enrollments and lessons
- [x] Local upload pipeline with BullMQ/FFmpeg HLS worker integration
- [x] Quizzes, grading and progress
- [x] Live-class scheduling, Socket.IO chat/signalling and LiveKit token integration
- [x] PDF certificate generation
- [x] Instructor earnings and Razorpay test-mode integration seams
- [x] Admin overview
- [x] AI tutor with saved conversations and generated study plans (requires provider key)
- [x] Organization creation and membership management UI/API foundation
- [ ] Full automated browser E2E suite and hosted staging environment

### Release 2 — Trust, operations and enterprise readiness
- Email verification and password reset; refresh-token rotation and session revocation
- Tenant-scoped authorization on every organization-owned resource
- Audit trail, moderation/reporting, admin support tools and data export/deletion
- Razorpay webhook reconciliation and idempotency
- Private S3 + CloudFront signed delivery; upload scanning and lifecycle policies
- LiveKit room lifecycle, attendance reconciliation and recording consent
- Observability: structured logs, error tracking, metrics, uptime checks and backups
- CI pipeline, dependency scanning, load tests and deployment environments

### Release 3 — AI and career intelligence
- Course-grounded RAG using only licensed/authorized course material
- AI-generated practice quizzes with instructor review before publishing
- Learner skill graph and transparent recommendation explanations
- Project rubrics, coding assessments and interview simulations
- AI usage quotas, cost budgets, feedback and quality evaluations

## Architecture principles
- Modular monolith; domain modules own their routes, schemas and services.
- MongoDB is the system of record; Redis is for queues/cache, never the only copy of business data.
- Long-running media work is asynchronous and observable.
- Payment state is confirmed by signed provider webhooks, not browser redirects.
- AI is server-side, rate-limited, bounded by input/output limits, and never receives secrets.
- Tenant authorization is enforced in backend queries, not just hidden UI controls.
- Accessibility, responsive layouts, privacy and secure defaults are product requirements.

## Success metrics to measure (do not fabricate)
- Activation: signup-to-first-enrollment and signup-to-first-lesson completion.
- Learning: weekly active learners, lesson completion, quiz improvement and course completion.
- Teaching: instructor activation, course publication time and learner engagement.
- Reliability: API p95 latency, video processing success/time, live session join success.
- Business: paid conversion, refunds, instructor payout accuracy and organization retention.
- AI quality: helpfulness rating, answer correction rate, latency and cost per active learner.

## Commercial model hypotheses
- Free learner tier with limited courses and AI credits.
- Plus learner subscription for expanded AI, learning paths and career tools.
- Instructor marketplace fee or subscription for advanced studio analytics.
- Institution/business subscriptions priced by active seats and feature tier.
- Never sell learner data; provide clear consent, retention and export controls.

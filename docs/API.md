# EduNexa API Reference

> **Base URL:** `http://localhost:5000/api`  
> **Auth:** `Authorization: Bearer <JWT>` (obtain from `/auth/login` or `/auth/register`)  
> **Swagger UI:** `http://localhost:5000/api-docs`  
> **Content-Type:** `application/json` (unless noted otherwise)

---

## Authentication Routes — `/api/auth`

### POST `/api/auth/register`

Create a new student or instructor account. Admin accounts cannot be self-registered.

**Access:** Public

**Request body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "student"
}
```
> `role` must be `"student"` or `"instructor"`. Omitting it defaults to `"student"`.

**Response `201`:**
```json
{
  "token": "<jwt>",
  "user": {
    "id": "64f...",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "student",
    "bio": null,
    "avatar": null
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 400 | Name, email and password are required |
| 400 | Password must be at least 8 characters |
| 403 | Admin accounts are provisioned by an administrator |
| 409 | Email already registered (Mongoose unique index) |

---

### POST `/api/auth/login`

**Access:** Public

**Request body:**
```json
{ "email": "jane@example.com", "password": "SecurePass123!" }
```

**Response `200`:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "student" }
}
```

**Errors:**
| Status | Message |
|---|---|
| 401 | Incorrect email or password |

---

### GET `/api/auth/me`

Return the authenticated user's profile.

**Access:** Any signed-in user

**Response `200`:**
```json
{
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "student", "bio": "...", "avatar": "..." }
}
```

---

## Course Routes — `/api/courses`

### GET `/api/courses`

List all published courses. Supports optional `?category=` filter.

**Access:** Public

**Query params:** `category` (string, optional)

**Response `200`:**
```json
{
  "courses": [
    {
      "_id": "...",
      "title": "React Fundamentals",
      "description": "...",
      "category": "Development",
      "level": "Beginner",
      "thumbnail": "https://...",
      "price": 0,
      "instructor": { "_id": "...", "name": "John Smith" },
      "published": true,
      "lessons": [{ "_id": "...", "title": "Intro", "order": 1, "duration": 12 }]
    }
  ]
}
```

---

### GET `/api/courses/:id`

Get a single course with full lesson list.

**Access:** Public

**Response `200`:** `{ "course": { ...fullCourseObject } }`

**Errors:** `404 Course not found`

---

### POST `/api/courses`

Create a new course.

**Access:** Instructor, Admin

**Request body:**
```json
{
  "title": "Node.js Mastery",
  "description": "Build REST APIs from scratch.",
  "category": "Backend",
  "level": "Intermediate",
  "price": 999,
  "published": false
}
```

**Response `201`:** `{ "course": { ...newCourse, "instructor": "<userId>" } }`

---

### PATCH `/api/courses/:id`

Update course metadata. Instructors can only update their own courses; admins can update any.

**Access:** Course owner (Instructor) or Admin

**Request body:** Any subset of course fields (title, description, category, level, price, thumbnail, published).

**Response `200`:** `{ "course": { ...updatedCourse } }`

**Errors:** `403 Not your course`, `404 Course not found`

---

### DELETE `/api/courses/:id`

> [!NOTE]
> Not yet implemented in routes. Admin-only planned feature.

---

### POST `/api/courses/:id/enroll`

Enroll the authenticated student in a free course. Paid courses require payment verification first.

**Access:** Student

**Response `201`:**
```json
{ "enrollment": { "_id": "...", "student": "...", "course": "...", "progress": 0, "paid": true } }
```

**Errors:**
| Status | Message |
|---|---|
| 402 | This is a paid course. Complete checkout before enrolling. |
| 404 | Course unavailable |

---

### POST `/api/courses/:id/lessons`

Add a lesson to a course.

**Access:** Course owner (Instructor) or Admin

**Request body:**
```json
{
  "title": "Lesson 1: Introduction",
  "description": "Overview of the module.",
  "order": 1,
  "duration": 15
}
```

**Response `201`:** `{ "course": { ...courseWithNewLesson } }`

---

### POST `/api/courses/lessons/:lessonId/upload`

Upload a video file for a lesson. Stored locally via Multer. If Redis + FFmpeg are available, queues a BullMQ transcode job for HLS output.

**Access:** Course owner (Instructor) or Admin  
**Content-Type:** `multipart/form-data`  
**Field name:** `video`  
**Max size:** `MAX_FILE_SIZE_MB` (default 500 MB)

**Response `201`:**
```json
{
  "message": "Video uploaded and queued for HLS processing",
  "videoUrl": "/uploads/abc123.mp4",
  "queued": true
}
```

**Errors:** `400 Video file is required`, `403 Not your course`, `404 Lesson not found`

---

### PATCH `/api/courses/:id/lessons/reorder`

> [!NOTE]
> Planned endpoint — update `order` fields on lessons.

---

### GET `/api/courses/:id/reviews`

> [!NOTE]
> Planned endpoint — list reviews for a course.

---

### POST `/api/courses/:id/reviews`

> [!NOTE]
> Planned endpoint — submit a rating and comment.

---

### DELETE `/api/courses/:id/reviews/:reviewId`

> [!NOTE]
> Planned endpoint — remove a review (owner or admin).

---

## Learning Routes — `/api/me`

### GET `/api/me/enrollments`

List all enrollments for the authenticated student, including course and instructor details.

**Access:** Student

**Response `200`:**
```json
{
  "enrollments": [
    {
      "_id": "...",
      "course": { "_id": "...", "title": "React Fundamentals", "instructor": { "name": "John" }, "lessons": [...] },
      "completedLessons": ["lessonId1"],
      "progress": 33,
      "paid": true,
      "enrolledAt": "2026-10-01T10:00:00Z"
    }
  ]
}
```

---

### POST `/api/me/lessons/:lessonId/complete`

Mark a lesson as complete and recalculate course progress (server-side).

**Access:** Enrolled Student

**Response `200`:**
```json
{
  "enrollment": {
    "_id": "...",
    "completedLessons": ["lessonId1", "lessonId2"],
    "progress": 66,
    "completedAt": null
  }
}
```

**Errors:** `403 Enroll in this course first`, `404 Lesson not found`

---

### GET `/api/me/quizzes`

List quizzes. Supports `?course=<courseId>`. Answer keys (`correctIndex`, `explanation`) are **never returned** from this endpoint.

**Access:** Any signed-in user

**Response `200`:** `{ "quizzes": [{ "_id": "...", "title": "...", "questions": [{ "prompt": "...", "options": [...] }] }] }`

---

### POST `/api/me/quizzes`

Create a quiz for a course.

**Access:** Instructor, Admin

**Request body:**
```json
{
  "course": "<courseId>",
  "title": "JavaScript Basics Quiz",
  "questions": [
    {
      "prompt": "Which keyword declares a block-scoped variable?",
      "options": ["var", "let", "function", "class"],
      "correctIndex": 1,
      "explanation": "let is block-scoped; var is function-scoped.",
      "points": 2
    }
  ]
}
```

**Response `201`:** `{ "quiz": { ...newQuiz } }`

---

### GET `/api/me/quizzes/:id`

Get a single quiz without answer keys.

**Access:** Any signed-in user

**Response `200`:** `{ "quiz": { ...quizWithoutAnswers } }`

---

### POST `/api/me/quizzes/:id/submit`

Submit answers and receive server-side grading. The student must be enrolled in the course.

**Access:** Enrolled Student

**Request body:**
```json
{ "answers": [1, 0, 2] }
```
> Array index corresponds to question index. Values are the selected option index.

**Response `200`:**
```json
{
  "attempt": {
    "id": "...",
    "score": 4,
    "total": 5,
    "percentage": 80
  },
  "results": [
    { "correct": true, "correctIndex": 1, "explanation": "let is block-scoped." },
    { "correct": false, "correctIndex": 0, "explanation": "var is function-scoped." }
  ]
}
```

**Errors:** `403 Enroll in the course first`, `404 Quiz not found`

---

### GET `/api/me/certificates/:courseId`

Download a PDF certificate. Requires 100% lesson completion.

**Access:** Enrolled Student (100% complete)  
**Response:** `application/pdf` binary stream with `Content-Disposition: attachment`

**Errors:** `400 Complete every lesson to unlock your certificate`

---

## Live Class Routes — `/api/live`

### GET `/api/live/classes`

List all live classes (scheduled, live, ended), sorted by start time.

**Access:** Any signed-in user

**Response `200`:**
```json
{
  "classes": [
    {
      "_id": "...",
      "title": "Advanced React Patterns",
      "course": { "_id": "...", "title": "React Fundamentals" },
      "instructor": { "_id": "...", "name": "John Smith" },
      "startsAt": "2026-11-10T14:00:00Z",
      "endsAt": "2026-11-10T15:30:00Z",
      "roomName": "edunexa-1730000000000-a8b3c",
      "status": "scheduled",
      "participantCount": 0
    }
  ]
}
```

---

### GET `/api/live/classes/:id`

> [!NOTE]
> Planned endpoint — get a single live class by ID.

---

### POST `/api/live/classes`

Schedule a new live class. A unique `roomName` is generated automatically.

**Access:** Instructor, Admin

**Request body:**
```json
{
  "course": "<courseId>",
  "title": "Q&A Session: Week 3",
  "startsAt": "2026-11-10T14:00:00Z",
  "endsAt": "2026-11-10T15:30:00Z"
}
```

**Response `201`:** `{ "liveClass": { ...liveClassObject } }`

---

### POST `/api/live/token`

Generate a LiveKit JWT room access token (2-hour TTL).

**Access:** Any signed-in user  
**Requires:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` configured in `server/.env`

**Request body:**
```json
{ "roomName": "edunexa-1730000000000-a8b3c" }
```

**Response `200`:**
```json
{
  "token": "<livekit-jwt>",
  "url": "wss://my-project.livekit.cloud"
}
```

**Errors:** `400 roomName is required`, `503 LiveKit is not configured`

---

### PATCH `/api/live/classes/:id/status`

> [!NOTE]
> Planned endpoint — update status to `live` or `ended`.

---

## Finance Routes — `/api`

### GET `/api/instructor/earnings`

Revenue summary for the authenticated instructor. Admins see all transactions.

**Access:** Instructor, Admin

**Response `200`:**
```json
{
  "totalRevenue": 24950,
  "transactions": [
    {
      "_id": "...",
      "course": { "title": "React Fundamentals" },
      "student": { "name": "Jane Doe", "email": "jane@example.com" },
      "amount": 999,
      "currency": "INR",
      "status": "paid",
      "createdAt": "2026-10-15T08:00:00Z"
    }
  ],
  "courses": [{ "_id": "...", "title": "React Fundamentals" }]
}
```

---

### GET `/api/instructor/earnings/monthly`

> [!NOTE]
> Planned endpoint — aggregate monthly revenue for charting.

---

### POST `/api/payments/order`

Create a Razorpay test order for a paid course.

**Access:** Student  
**Requires:** `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in `server/.env`

**Request body:**
```json
{ "courseId": "<courseId>" }
```

**Response `200`:**
```json
{
  "order": {
    "id": "order_xyz",
    "amount": 99900,
    "currency": "INR",
    "receipt": "enx_1730000000000"
  },
  "keyId": "rzp_test_..."
}
```

**Errors:** `503 Razorpay test keys are not configured`, `404 Course not found`

---

### POST `/api/payments/verify`

Verify a Razorpay payment signature (HMAC-SHA256) and activate enrollment.

**Access:** Student

**Request body:**
```json
{
  "razorpay_order_id": "order_xyz",
  "razorpay_payment_id": "pay_abc",
  "razorpay_signature": "<hmac-signature>"
}
```

**Response `200`:**
```json
{
  "message": "Payment verified",
  "payment": { "_id": "...", "status": "paid", "amount": 999 }
}
```

**Errors:** `400 Payment signature verification failed`, `404 Payment order not found`, `503 Razorpay is not configured`

---

## Admin Routes — `/api/admin`

All admin routes require the `admin` role.

### GET `/api/admin/overview`

Platform-wide aggregate counts.

**Access:** Admin

**Response `200`:**
```json
{ "users": 120, "courses": 18, "enrollments": 340, "paidPayments": 47 }
```

---

### GET `/api/admin/users`

List most recent 100 users (password hashes excluded).

**Access:** Admin

**Response `200`:** `{ "users": [{ "_id": "...", "name": "...", "email": "...", "role": "student", "createdAt": "..." }] }`

---

### GET `/api/admin/courses`

List all courses (published and draft) with instructor info.

**Access:** Admin

**Response `200`:** `{ "courses": [...] }`

---

### GET `/api/admin/payments`

> [!NOTE]
> Planned endpoint — paginated payment history for all courses.

---

### PATCH `/api/admin/courses/:id/publish`

> [!NOTE]
> Planned endpoint — toggle `published` status.

---

### PATCH `/api/admin/users/:id/role`

> [!NOTE]
> Planned endpoint — change a user's role (e.g., promote to instructor).

---

### DELETE `/api/admin/users/:id`

> [!NOTE]
> Planned endpoint — soft-delete or deactivate a user account.

---

## Notification Routes — `/api/notifications`

> [!NOTE]
> Model is defined (`Notification`); routes are planned for the next milestone.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | List unread + recent notifications |
| PATCH | `/api/notifications/:id/read` | Mark one notification read |
| PATCH | `/api/notifications/read-all` | Mark all read |
| DELETE | `/api/notifications/:id` | Delete a notification |

---

## AI Routes — `/api/ai`

All AI routes require authentication and are rate-limited to **30 requests per 15 minutes** per user.

### GET `/api/ai/conversations`

List the authenticated user's latest 30 conversation summaries.

**Access:** Any signed-in user

**Response `200`:**
```json
{
  "conversations": [
    {
      "_id": "...",
      "title": "Explain React hooks",
      "courseTitle": "React Fundamentals",
      "updatedAt": "2026-10-30T12:00:00Z",
      "messageCount": 8
    }
  ]
}
```

---

### GET `/api/ai/conversations/:id`

Retrieve full conversation message history. Only the owning user can access their conversations.

**Access:** Conversation owner

**Response `200`:** `{ "conversation": { "_id": "...", "title": "...", "messages": [{ "role": "user" | "assistant", "content": "...", "createdAt": "..." }] } }`

**Errors:** `404 Conversation not found`

---

### POST `/api/ai/chat`

Send a message to Nexa AI. Creates a new conversation or continues an existing one.

**Access:** Any signed-in user

**Request body:**
```json
{
  "message": "Explain closures in JavaScript with an example",
  "conversationId": "optional-existing-id",
  "courseId": "optional-course-context-id"
}
```
> `message` must be 1–4,000 characters. Context window is bounded to the last 12 messages.

**Response `200`:**
```json
{
  "conversationId": "...",
  "answer": "A closure is a function that retains access to its outer scope...",
  "createdAt": "2026-11-02T09:00:00Z"
}
```

**Errors:**
| Status | Message |
|---|---|
| 400 | Message must be between 1 and 4000 characters |
| 404 | Conversation not found |
| 429 | AI usage limit reached. Please try again later |
| 503 | AI is not configured. Add GEMINI_API_KEY or OPENAI_API_KEY to server/.env |

---

### DELETE `/api/ai/conversations/:id`

Delete an owned conversation permanently.

**Access:** Conversation owner

**Response `200`:** `{ "message": "Conversation deleted" }`

---

### GET `/api/ai/study-plan`

Generate a personalized 7-day study plan based on current enrollments and progress.

**Access:** Any signed-in user  
**Requires:** AI provider key configured server-side

**Response `200`:**
```json
{
  "plan": {
    "goal": "Build consistent JavaScript and React skills",
    "dailyMinutes": 45,
    "days": [
      {
        "day": "Day 1",
        "focus": "JavaScript Fundamentals Review",
        "tasks": ["Complete Lesson 3: Functions", "Practice 10 console exercises", "Review notes"],
        "estimatedMinutes": 45
      }
    ],
    "tips": ["Study at the same time each day", "Take 5-minute breaks every 25 minutes"]
  },
  "generatedAt": "2026-11-02T09:00:00Z"
}
```

---

## Organization Routes — `/api/organizations`

All organization routes require authentication.

> [!WARNING]
> Organization APIs are a **foundation only**. Full tenant-scoped isolation for courses, payments, and analytics must be completed before commercial use.

### GET `/api/organizations`

List all organizations where the authenticated user is an active member.

**Access:** Any signed-in user

**Response `200`:**
```json
{
  "organizations": [
    {
      "_id": "...",
      "name": "Acme Corp Learning",
      "slug": "acme-corp-learning",
      "plan": "growth",
      "status": "active",
      "membershipRole": "owner"
    }
  ]
}
```

---

### POST `/api/organizations`

Create a new organization. The creator automatically becomes the `owner` member.

**Access:** Any signed-in user

**Request body:**
```json
{
  "name": "Acme Corp Learning",
  "website": "https://acme.example.com"
}
```
> `name` must be 2–120 characters. A URL-safe `slug` is auto-generated.

**Response `201`:** `{ "organization": { "_id": "...", "name": "...", "slug": "acme-corp-learning", ... } }`

**Errors:** `400 Organization name must be 2–120 characters`

---

### GET `/api/organizations/:id/members`

List all members of an organization. Caller must be an active member.

**Access:** Active member of the organization

**Response `200`:**
```json
{
  "members": [
    {
      "organization": "...",
      "user": { "_id": "...", "name": "Jane Doe", "email": "jane@example.com", "avatar": null },
      "role": "owner",
      "status": "active"
    }
  ]
}
```

---

### POST `/api/organizations/:id/members`

Add an existing EduNexa user to an organization by email.

**Access:** Organization owner or org_admin

**Request body:**
```json
{
  "email": "bob@example.com",
  "role": "instructor"
}
```
> `role` must be `"org_admin"`, `"instructor"`, or `"learner"` (default).

**Response `201`:**
```json
{
  "membership": {
    "organization": "...",
    "user": { "_id": "...", "name": "Bob", "email": "bob@example.com" },
    "role": "instructor",
    "status": "active"
  }
}
```

**Errors:**
| Status | Message |
|---|---|
| 403 | Organization administrator access required |
| 404 | No EduNexa account exists for this email yet |

---

## Common Error Responses

All errors return JSON with a `message` field:

```json
{ "message": "You do not have permission to perform this action" }
```

| Status | Meaning |
|---|---|
| 400 | Validation error / bad request body |
| 401 | Missing or invalid JWT token |
| 402 | Payment required before enrollment |
| 403 | Authenticated but insufficient role |
| 404 | Resource not found |
| 429 | Rate limit exceeded (AI routes) |
| 503 | External service not configured (Razorpay / AI / LiveKit) |
| 500 | Unexpected server error |

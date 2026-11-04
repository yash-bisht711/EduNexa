# EduNexa — System Architecture

> **Version:** 2.0 · **Last updated:** November 2026  
> Modular monolith (Node.js + MongoDB) with optional cloud integrations.

---

## 1. System Architecture Overview

```mermaid
flowchart TD
    subgraph Client["Browser Client"]
        FE["React + Vite + Redux Toolkit\n(Tailwind CSS · Lucide Icons)"]
    end

    subgraph API["Express API Server (Port 5000)"]
        REST["REST Routes\n(auth / courses / learning / live /\nfinance / admin / ai / orgs / notifications)"]
        MW["Middleware\n(JWT auth · role check · error handler)"]
        SOCK["Socket.IO Server\n(room chat · WebRTC signalling)"]
    end

    subgraph Data["Data Layer"]
        DB[("MongoDB\n(Mongoose ODM)")]
        REDIS[("Redis\n(BullMQ queue store)")]
    end

    subgraph Media["Media Pipeline"]
        Q["BullMQ Queue\n(video jobs)"]
        W["FFmpeg Worker\n(transcode to HLS)"]
        HLS["HLS Output\n(server/uploads/hls/)"]
        S3["AWS S3\n(optional, production)"]
        CDN["CloudFront CDN\n(optional, signed URLs)"]
    end

    subgraph External["External Services (optional)"]
        LK["LiveKit SFU\n(managed WebRTC media)"]
        PAY["Razorpay\n(test payment gateway)"]
        AI_G["Gemini API\n(google generative AI)"]
        AI_O["OpenAI API\n(gpt-4o-mini / compatible)"]
        PDF["PDFKit\n(certificate generation)"]
    end

    FE -->|"HTTPS REST + JWT"| REST
    FE <-->|"WebSocket (chat · signalling)"| SOCK
    FE -->|"LiveKit SDK (optional)"| LK
    REST --> MW
    MW --> DB
    REST --> Q
    Q --> REDIS
    Q --> W
    W --> HLS
    HLS -->|"local dev"| FE
    HLS -->|"prod upload"| S3
    S3 --> CDN
    REST --> PDF
    REST -->|"order + verify"| PAY
    REST -->|"chat completion"| AI_G
    REST -->|"fallback"| AI_O
```

---

## 2. Data Model (ER Diagram)

```mermaid
erDiagram
    User {
        ObjectId _id
        string name
        string email
        string passwordHash
        string role
        string bio
        string avatar
        date createdAt
        date updatedAt
    }

    Course {
        ObjectId _id
        string title
        string description
        string category
        string level
        string thumbnail
        number price
        ObjectId instructor
        boolean published
        Lesson[] lessons
        date createdAt
        date updatedAt
    }

    Lesson {
        ObjectId _id
        string title
        string description
        string videoUrl
        string hlsUrl
        number duration
        number order
        Resource[] resources
    }

    Enrollment {
        ObjectId _id
        ObjectId student
        ObjectId course
        ObjectId[] completedLessons
        number progress
        boolean paid
        date enrolledAt
        date completedAt
    }

    Quiz {
        ObjectId _id
        ObjectId course
        ObjectId lessonId
        string title
        Question[] questions
        date createdAt
    }

    QuizAttempt {
        ObjectId _id
        ObjectId quiz
        ObjectId student
        number[] answers
        number score
        number total
        date submittedAt
    }

    LiveClass {
        ObjectId _id
        ObjectId course
        ObjectId instructor
        string title
        date startsAt
        date endsAt
        string roomName
        string status
        string recordingUrl
        number participantCount
    }

    Payment {
        ObjectId _id
        ObjectId student
        ObjectId course
        number amount
        string currency
        string providerOrderId
        string providerPaymentId
        string status
        date paidAt
    }

    Review {
        ObjectId _id
        ObjectId course
        ObjectId student
        number rating
        string comment
        date createdAt
    }

    Notification {
        ObjectId _id
        ObjectId user
        string type
        string title
        string body
        boolean read
        string link
        date createdAt
    }

    AIConversation {
        ObjectId _id
        ObjectId user
        string title
        Message[] messages
        Context context
        date createdAt
        date updatedAt
    }

    Organization {
        ObjectId _id
        string name
        string slug
        ObjectId owner
        string website
        string plan
        string status
        date createdAt
    }

    OrganizationMembership {
        ObjectId _id
        ObjectId organization
        ObjectId user
        string role
        string status
        date createdAt
    }

    User ||--o{ Course : "instructs"
    User ||--o{ Enrollment : "has"
    User ||--o{ QuizAttempt : "attempts"
    User ||--o{ Payment : "makes"
    User ||--o{ Review : "writes"
    User ||--o{ Notification : "receives"
    User ||--o{ AIConversation : "owns"
    User ||--o{ OrganizationMembership : "belongs to"
    Course ||--|{ Lesson : "contains (embedded)"
    Course ||--o{ Enrollment : "has"
    Course ||--o{ Quiz : "has"
    Course ||--o{ LiveClass : "has"
    Course ||--o{ Payment : "involves"
    Course ||--o{ Review : "has"
    Quiz ||--o{ QuizAttempt : "generates"
    Organization ||--o{ OrganizationMembership : "has"
```

---

## 3. Request Flow Diagrams

### 3.1 Video Upload → Transcode → HLS Delivery

```mermaid
sequenceDiagram
    participant I as Instructor Browser
    participant API as Express API
    participant FS as Local Filesystem
    participant Q as BullMQ Queue
    participant W as FFmpeg Worker
    participant HLS as HLS Output
    participant DB as MongoDB

    I->>API: POST /api/courses/lessons/:id/upload (multipart video)
    API->>API: auth + role check (instructor/admin)
    API->>FS: Multer saves raw file → uploads/
    API->>DB: Update lesson.videoUrl (immediate playback)
    API->>Q: Add transcode job {inputPath, lessonId, courseId}
    API-->>I: 201 {videoUrl, queued: true}
    Note over Q,W: Async — happens in background
    W->>Q: Poll next job
    W->>FS: FFmpeg reads raw file
    W->>HLS: Write .m3u8 + .ts segments → uploads/hls/
    W->>DB: Update lesson.hlsUrl to HLS manifest path
    Note over I,HLS: On lesson view — player prefers hlsUrl over videoUrl
    I->>HLS: Stream HLS segments via <video src>
```

### 3.2 Live Class Join Flow

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant API as Express API
    participant DB as MongoDB
    participant LK as LiveKit SFU
    participant SOCK as Socket.IO

    S->>API: GET /api/live/classes
    API-->>S: List of scheduled/live classes
    S->>SOCK: Connect WebSocket (JWT auth)
    S->>SOCK: emit room:join {roomName}
    SOCK-->>S: Joined room channel

    alt LiveKit configured
        S->>API: POST /api/live/token {roomName}
        API->>LK: Create AccessToken (2h TTL)
        API-->>S: {token, url}
        S->>LK: room.connect(url, token)
        LK-->>S: Audio/video streams
    else Local demo mode
        Note over S,SOCK: Socket.IO chat + WebRTC signalling events only
    end

    S->>SOCK: emit chat:message {roomName, message}
    SOCK-->>S: Broadcast to all room members
```

### 3.3 Payment + Enrollment Flow

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant RZP as Razorpay Checkout
    participant API as Express API
    participant DB as MongoDB

    S->>API: POST /api/payments/order {courseId}
    API->>API: Check RAZORPAY_KEY_ID/SECRET configured
    API->>RZP: orders.create {amount, currency, receipt}
    RZP-->>API: {id: order_id, ...}
    API->>DB: Create Payment {status: 'created'}
    API-->>S: {order, keyId}

    S->>RZP: Open Razorpay checkout modal
    RZP-->>S: Payment UI (card / UPI / netbanking)
    S->>RZP: Complete payment
    RZP-->>S: {razorpay_order_id, razorpay_payment_id, razorpay_signature}

    S->>API: POST /api/payments/verify {order_id, payment_id, signature}
    API->>API: HMAC-SHA256 signature verification
    API->>DB: Update Payment {status: 'paid'}
    API->>DB: Upsert Enrollment {paid: true}
    API-->>S: 200 {message: 'Payment verified', payment}
    Note over S: Course lessons now unlocked
```

### 3.4 Quiz Submission + Grading Flow

```mermaid
sequenceDiagram
    participant S as Student Browser
    participant API as Express API
    participant DB as MongoDB

    S->>API: GET /api/me/quizzes?course=:id
    API->>DB: Quiz.find({course}) — strip correctIndex + explanation
    API-->>S: {quizzes} (answer keys never sent to client)

    S->>S: Student selects answers locally
    S->>API: POST /api/me/quizzes/:id/submit {answers: [0,2,1,...]}
    API->>DB: Quiz.findById (with correct answers)
    API->>DB: Enrollment.findOne (verify enrollment)
    API->>API: Server-side scoring loop (correctIndex match)
    API->>DB: QuizAttempt.create {score, total, answers}
    API-->>S: {attempt: {score, total, percentage}, results: [{correct, explanation}]}
    Note over S: Correct answers revealed AFTER submission, never before
```

---

## 4. Security Architecture

### 4.1 JWT Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express API
    participant DB as MongoDB

    C->>API: POST /api/auth/login {email, password}
    API->>DB: User.findOne({email})
    API->>API: bcrypt.compare(password, passwordHash)
    API->>API: jwt.sign({sub: userId, role}, JWT_SECRET, {expiresIn: '7d'})
    API-->>C: {token, user: {id, name, email, role}}

    Note over C: Token stored in localStorage as 'edunexa_token'

    C->>API: GET /api/me/enrollments (Authorization: Bearer <token>)
    API->>API: auth middleware: jwt.verify(token, JWT_SECRET)
    API->>DB: User.findById(payload.sub)
    API->>API: allow('student') middleware: role check
    API-->>C: {enrollments}
```

### 4.2 Role-Based Access Control

| Role | Registration | Course Management | Enroll / Learn | Quiz Submit | Earnings | Admin Panel | AI Coach | Organizations |
|---|---|---|---|---|---|---|---|---|
| **Student** | Self-register | Read published | ✅ | ✅ | ❌ | ❌ | ✅ | Member |
| **Instructor** | Self-register | Own courses only | ❌ | ❌ | Own earnings | ❌ | ✅ | Member / Owner |
| **Admin** | Admin-provisioned | All courses | ❌ | ❌ | All earnings | ✅ | ✅ | Member / Owner |
| **Org Owner** | Any role + owns org | Per role | Per role | Per role | Per role | ❌ | ✅ | ✅ |
| **Org Admin** | Any role + org admin | Per role | Per role | Per role | Per role | ❌ | ✅ | ✅ |

### 4.3 Never-Expose List

> [!CAUTION]
> The following must **never** be sent to the browser, committed to Git, or logged in plaintext.

| Secret | Why it matters |
|---|---|
| `JWT_SECRET` | Forging tokens grants full account impersonation |
| `RAZORPAY_KEY_SECRET` | Used for HMAC payment verification |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | Billable; rate-limited per account |
| `AWS_SECRET_ACCESS_KEY` | Full S3 bucket access |
| `LIVEKIT_API_SECRET` | Token minting for media rooms |
| MongoDB/Redis connection strings | Direct database access |
| `passwordHash` fields | Never returned in any user API response |
| `Quiz.questions[].correctIndex` | Never sent until after submission |
| `Quiz.questions[].explanation` | Withheld until after submission |

---

## 5. Frontend Component Architecture

### 5.1 Page Components

| Route | Component | Auth Required | Role |
|---|---|---|---|
| `/login`, `/register` | `AuthPage` | No | Public |
| `/` | `Dashboard` | Yes | All |
| `/learning` | `Learning` | Yes | Student |
| `/courses` | `Courses` | Yes | All |
| `/course/:id` | `CourseDetail` | Yes | All (enroll requires Student) |
| `/live` | `Live` | Yes | All |
| `/quizzes` | `Quizzes` | Yes | Student |
| `/certificates` | `Certificates` | Yes | Student |
| `/ai` | `AIStudio` | Yes | All |
| `/organizations` | `Organizations` | Yes | All |
| `/manage` | `Manage` | Yes | Instructor / Admin |
| `/earnings` | `Earnings` | Yes | Instructor / Admin |
| `/admin` | `Admin` | Yes | Admin only |

### 5.2 Shared Components

| Component | Purpose |
|---|---|
| `Shell` | Root layout: sidebar nav + sticky header + routing outlet |
| `CourseCard` | Reusable course tile (thumbnail, price, level) |
| `CourseProgress` | Enrollment card with progress bar |
| `LiveRoom` | Socket.IO chat + LiveKit media frame |
| `LiveKitMedia` | LiveKit SDK room connection + video grid |
| `QuizList` | Fetches and lists quizzes for enrolled courses |
| `Heading` | Page heading with eyebrow text + optional action button |
| `Empty` | Consistent empty-state placeholder with icon |
| `Notice` | Inline error/success message banner |

### 5.3 State Management (Redux Toolkit)

```
store.js
  └─ authSlice
       ├─ state: { user: null | UserObject, token: string | null }
       ├─ setSession(data) — called after login/register; persists token to localStorage
       └─ logout() — clears state and localStorage token
```

**API Layer:** `client/src/api.js` — Axios instance with base URL `/api` and request interceptor that injects `Authorization: Bearer <token>` from `localStorage.edunexa_token`.

---

## 6. Deployment Architecture

### Development (default)

```
localhost:5173  →  Vite dev server (React)
localhost:5000  →  Express API
localhost:27017 →  MongoDB (Docker)
localhost:6379  →  Redis (Docker)
uploads/        →  Local file storage (Multer)
uploads/hls/    →  FFmpeg HLS output
```

### Production Target

```
CloudFront CDN  →  S3 bucket (private, signed URLs)
                →  React SPA (public bucket or CDN origin)
HTTPS domain    →  Load balancer → Express API (multiple instances)
                →  MongoDB Atlas (managed, replica set)
                →  Redis Cloud / ElastiCache
LiveKit Cloud   →  Managed SFU (WebRTC media)
Secrets Manager →  All credentials (no .env files in prod)
```

> [!IMPORTANT]
> EduNexa is currently a **modular monolith**. MongoDB is the single source of truth. Redis is required only for BullMQ video queuing — all other features work without it. Organization multi-tenancy isolation is a foundation only; full per-organization scoping of courses and payments must be completed before institutional production use.

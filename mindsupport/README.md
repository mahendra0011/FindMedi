# MindSupport

**MindSupport** is a comprehensive digital mental health and counselling platform for higher education students. It provides confidential counsellor discovery, session booking, secure real-time chat, wellness tracking, peer support, resource hub, and emergency support — all within a single JavaScript-only, MongoDB-only monorepo.

> Live deployment: [https://mindsupport-1.onrender.com/](https://mindsupport-1.onrender.com/)

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, React Router v6, Vite 5 |
| **State** | Redux Toolkit, TanStack Query |
| **Styling** | Tailwind CSS 3, shadcn/ui (Radix primitives), Lucide icons, GSAP animations |
| **Backend** | Node.js, Express 5 |
| **Database** | MongoDB (Mongoose) — local or Atlas |
| **Auth** | JWT (access + refresh tokens), bcryptjs, OTP verification |
| **Real-Time** | Socket.io |
| **Charts** | Recharts |
| **Email** | Brevo (Sendinblue) transactional API |
| **File Uploads** | Cloudinary (face-crop image transformations) |
| **Video Sessions** | Google Meet link integration |
| **Media** | YouTube Data API v3 (with curated fallback) |
| **Mobile** | Capacitor 7 (ready for native builds) |
| **Testing** | Playwright (Chromium, Firefox, WebKit) |

---

## Features

### 🔐 Authentication & Roles
- **3 user roles:** User (student), Counsellor (with approval workflow), Admin
- JWT-based auth with access/refresh tokens
- Email OTP verification via Brevo
- Google OAuth support
- Forgot / reset password flow

### 👨‍⚕️ Counsellor Marketplace & Booking
- Browse counsellors with search/filter by specialization, language, consultation mode, pricing
- Professional profile cards with ratings, reviews, certificates
- Detailed counsellor profile pages
- **Support packages:** One-time, Short-term, Medium-term, Long-term plans
- Session booking with Google Meet / voice call / in-person modes
- Anonymous booking option
- Intake forms before first session
- Session scheduling & calendar management

### 💬 Secure Real-Time Chat
- WhatsApp-style messaging with Socket.io
- Reply, edit, soft-delete messages
- Emoji reactions
- **Attachments:** Images & PDFs up to 5MB with preview
- Read receipts
- Chat only with booked counsellors
- Pasted resource link previews
- Soft-delete (no "message deleted" placeholder)

### 📊 Wellness Tracking
- **Mood logging** (1-5 scale) with daily entries
- **Clinical assessments:** PHQ-9 (depression) & GAD-7 (anxiety) with automatic scoring, level classification, and recommendations
- **Journaling** with optional counsellor sharing
- **Gratitude & trigger tracking**
- **Wellness goals** with progress tracking
- Emergency keyword detection & SOS records

### 📚 Resource Hub
- Curated articles & videos on mental health topics
- YouTube wellness videos via backend proxy (API key or curated fallback)
- Article cards with thumbnails / generated fallback covers
- Categories: motivation, stress, burnout, sleep, self-confidence, relationships, recovery, trauma

### 👥 Peer Support
- Anonymous peer posts & comments
- Upvote / downvote system
- Crisis keyword detection & auto-flagging
- Report system for moderation

### 🎛️ Role Dashboards

#### User Dashboard
- Sessions, wellness tracking, journal, self-care
- Chat with counsellors, payments, privacy settings
- Emergency support access

#### Counsellor Dashboard
- Appointments, availability management, patient profiles
- Session notes (AES-256 encrypted)
- Chat, reviews, earnings, notifications
- Google Meet link configuration

#### Admin Dashboard
- User management, counsellor approval/rejection
- Session monitoring, revenue analytics, reports
- Reviews moderation, announcements, emergency alerts
- Platform-wide notifications

### 💳 Payments & Packages
- Session/package billing with platform commission
- Counsellor payout calculation
- Invoice generation
- Support package management (CRUD)

### 🔒 Security
- Helmet security headers
- CORS configuration
- Rate limiting (global, auth, OTP, sensitive endpoints)
- JWT tokens with short-lived access + long-lived refresh
- bcrypt password hashing
- AES-256 encrypted session notes
- Input sanitization & XSS protection
- Soft-delete for messages

### 🎨 UI/UX
- **Dark/Light theme** (next-themes)
- **Multi-language framework** (LanguageContext in place)
- GSAP animations, ReactBits-style components
- Responsive design with Tailwind CSS
- shadcn/ui component library

---

## Role Flow

### User
Create a normal account → Browse counsellors → Book a session (with optional intake form) → Chat with booked counsellor → Track wellness → Journal → Access resources → Peer support

### Counsellor
Sign up with counsellor type → Submit verification details (license, certificates, experience, etc.) → Wait for admin approval → Access counsellor dashboard → Manage availability → Accept appointments → Conduct sessions (Google Meet/voice/in-person) → Write encrypted session notes → Chat with patients → View earnings & reviews

```
role = counsellor
status = pending
verificationStatus = pending
```

### Admin
Manually created via CLI script → Approve/reject counsellors → Manage users → Monitor sessions → View revenue & analytics → Moderate reviews → Send announcements → Review emergency alerts

---

## Project Structure

```
mindsupport/
├── .env.example              # Environment variables template
├── index.html                # Vite entry with meta tags
├── package.json              # Scripts & dependencies
├── vite.config.js            # Vite config (SWC, @ alias, /api proxy)
├── tailwind.config.js        # Tailwind design system
├── components.json           # shadcn/ui config
├── render.yaml               # Render deployment config
│
├── public/                   # Static assets (favicon, robots.txt, etc.)
│
├── src/                      # Frontend (React)
│   ├── main.jsx              # Entry point with Redux Provider
│   ├── App.jsx               # Routes, QueryClient, Theme/Language providers
│   ├── index.css / App.css   # Global styles
│   │
│   ├── components/           # Shared components
│   │   ├── ui/               # shadcn/Radix primitives (40+)
│   │   ├── reactbits/        # Custom animated components
│   │   ├── chat/             # MessageAttachments, ComposerAttachmentPreview
│   │   ├── Navigation.jsx, Hero.jsx, Footer.jsx
│   │   ├── MoodTracker.jsx, EmergencySupport.jsx
│   │   └── ...               # 15+ feature components
│   │
│   ├── pages/                # 20 route pages
│   │   ├── Index.jsx         # Home page
│   │   ├── Login.jsx, Signup.jsx
│   │   ├── Dashboard.jsx     # Role-based redirect
│   │   ├── UserDashboard.jsx, CounsellorDashboard.jsx, AdminDashboard.jsx
│   │   ├── Counselling.jsx, SessionSchedule.jsx
│   │   ├── ResourceHub.jsx, PeerSupport.jsx, MyWellness.jsx
│   │   └── ...
│   │
│   ├── store/                # Redux Toolkit (auth, counsellors, notifications, etc.)
│   ├── hooks/                # Custom hooks
│   ├── contexts/             # ThemeContext, LanguageContext
│   ├── lib/                  # API client, socket helper, sanitize, utils
│   └── assets/               # Images
│
├── backend/                  # Backend (Express + MongoDB)
│   ├── server.js             # Entry point
│   ├── src/
│   │   ├── app.js            # Express app (middleware, routes, static serving)
│   │   ├── config/env.js     # Environment config
│   │   ├── database/         # MongoDB connection + seed
│   │   ├── models/index.js   # 18 Mongoose models
│   │   ├── routes/           # 17 route modules
│   │   ├── realtime/socket.js# Socket.io (JWT auth, rooms)
│   │   └── services/         # Email (Brevo), Cloudinary
│   └── scripts/              # Admin creation & seed scripts
│
├── tests/                    # Playwright e2e tests
└── dist/                     # Production build output
```

### Data Models (18)

User, OtpVerification, Resource, Appointment, Review, Journal, Message, Payment, Notification, PeerPost, PeerComment, PeerReport, MoodEntry, Assessment, CounsellorApplication, SupportPackage, UserPackage, IntakeForm, ConsentForm, WellnessGoal, Prescription, Assignment, CounsellorReport

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

PowerShell:
```powershell
Copy-Item .env.example .env
```

Minimum local values:

```env
VITE_API_BASE_URL=http://localhost:5001
PORT=5001
CLIENT_ORIGIN=http://localhost:8080
MONGODB_URI=mongodb://127.0.0.1:27017/mindsupport
MONGODB_DATABASE=mindsupport
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
```

### 3. Run frontend + backend

```bash
npm run dev:full
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| Backend | http://localhost:5001 |
| Health check | `GET http://localhost:5001/api/health` |

---

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite frontend only |
| `npm run dev:api` | Start Express backend (watch mode) |
| `npm run dev:full` | Run frontend + backend concurrently |
| `npm run build` | Build production frontend |
| `npm run server` / `npm run start` | Start Express backend |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run create:admin` | Create/update admin account |
| `npm run seed:resources` | Seed resources only |
| `npm run seed:counsellors` | Seed approved counsellors |
| `npm run seed:all` | Seed full launch data |

---

## Admin Creation

```bash
npm run create:admin -- admin@example.com your-password "Admin Name"
```

Or with environment variables:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your-password ADMIN_NAME="Admin Name" npm run create:admin
```

---

## Seed Data

Creates full launch data: users, counsellors, appointments, resources, journals, mood entries, assessments, messages, payments, notifications, reviews, peer posts/comments.

```bash
npm run seed:all
```

---

## Frontend Routes

| Route | Access | Page |
| --- | --- | --- |
| `/` | Public | Home |
| `/book` | Public | Counselling marketplace |
| `/counselling` | Public | Counselling marketplace |
| `/counselling/:id` | Public | Counsellor profile |
| `/resources` | Public | Resource Hub |
| `/about` | Public | About |
| `/login` | Public | Login |
| `/signup` | Public | Signup |
| `/forgot-password` | Public | Forgot Password |
| `/reset-password` | Public | Reset Password |
| `/dashboard` | Protected | Role-based redirect |
| `/user` | User | User Dashboard |
| `/counsellor` | Counsellor (approved) | Counsellor Dashboard |
| `/admin` | Admin | Admin Dashboard |
| `/session-schedule` | User | Session Schedule |
| `/wellness` | User/Admin | My Wellness |
| `/peer` | User/Admin | Peer Support |
| `/intake/:packageId` | User | Intake Form |

---

## API Highlights

### Auth
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register user or counsellor |
| `POST` | `/api/auth/login` | Login (email or username) |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/otp/request` | Request OTP |
| `POST` | `/api/auth/otp/verify` | Verify OTP |
| `POST` | `/api/auth/forgot-password` | Forgot password |
| `POST` | `/api/auth/reset-password` | Reset password |

### Marketplace & Appointments
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/counsellors` | Browse counsellors (filter/search) |
| `GET` | `/api/counsellors/:id` | Counsellor profile |
| `GET` | `/api/packages` | Support packages |
| `POST` | `/api/appointments` | Book session |
| `PUT` | `/api/appointments/:id` | Update appointment status |
| `POST` | `/api/intake` | Submit intake form |

### Communication
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/messages` | List messages |
| `POST` | `/api/messages` | Send message (text/image/PDF) |
| `PATCH` | `/api/messages/:id` | Edit message |
| `DELETE` | `/api/messages/:id` | Soft-delete message |
| `POST` | `/api/messages/:id/reactions` | React to message |
| `PATCH` | `/api/messages/:id/read` | Mark as read |

### Wellness
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/wellness/mood` | Save mood entry |
| `GET` | `/api/wellness/mood` | Get mood history |
| `POST` | `/api/wellness/assessment` | Save PHQ-9/GAD-7 assessment |
| `GET` | `/api/wellness/assessments` | Get assessment history |
| `POST` | `/api/wellness/emergency` | Trigger SOS record |
| `GET` | `/api/goals` | List wellness goals |
| `POST` | `/api/goals` | Create goal |
| `PATCH` | `/api/goals/:id/progress` | Update goal progress |

### Resources
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/resources` | List resources |
| `GET` | `/api/resources/youtube` | Search YouTube videos |

### Peer Support
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/peer/posts` | List peer posts |
| `POST` | `/api/peer/posts` | Create post |
| `POST` | `/api/peer/posts/:id/vote` | Upvote/downvote |
| `POST` | `/api/peer/posts/:id/report` | Report post |

### Admin
| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Admin stats |
| `POST` | `/api/admin/counsellors/:id/verify` | Approve/reject counsellor |
| `GET` | `/api/admin/revenue` | Revenue analytics |
| `POST` | `/api/admin/notifications` | Send announcement |

---

## Environment Variables

See `.env.example` for full reference. Key variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend port (default: 8089) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `VITE_API_BASE_URL` | Backend URL for frontend (empty = same-origin in production) |
| `GOOGLE_MEET_DEFAULT_LINK` | Shared Google Meet room |
| `YOUTUBE_API_KEY` | YouTube Data API key |
| `BREVO_API_KEY` | Brevo transactional email API key |
| `CLOUDINARY_URL` | Cloudinary image upload config |
| `NOTES_ENCRYPTION_KEY` | AES-256 key for session notes |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Auto-seeded admin account |

---

## Deployment (Render)

One Web Service deployment (Express serves built React):

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |

Set `VITE_API_BASE_URL` empty for same-origin, or point to your backend URL for separate deployments.

---

## Quality Checks

```bash
npm run lint
npm run build
```

---

## Safety Notice

MindSupport provides emotional support, counselling workflows, wellness tracking, and educational mental health resources. It does **not** replace medical, psychiatric, or emergency care. For immediate danger, users should contact local emergency services or a crisis helpline.

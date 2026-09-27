# MindSupport + FindMedi Merge: Poora Plan (Index)

Repo dekha gaya: `mahendra0011/FindMedi`, commit `df7f20d` ("add mindsupport").
Ye 16 files ka set hai. Har file ke andar: details, flow, logic, code, UI aur animations. Koi diagram/graph nahi hai, sab flow text me hai.

---

## 1. Problem ek line me

MindSupport FindMedi me "chipka" diya gaya hai, "merge" nahi hua. Do backend, do database, do login system, do dashboard, do booking system, do payment system. Upar se MindSupport backend ki authentication poori band hai, isliye uske dashboards aur booking asal me kaam hi nahi karte (file 01 me proof).

## 2. Final goal

1. **Ek platform, ek login**: FindMedi ka user hi MindSupport ka user hai.
2. **Ek user dashboard**: patient ke sidebar me "Mind & Wellness" ek expandable section, alag app jaisa nahi.
3. **Do provider types**:
   - **Psychiatrist** = FindMedi ka `doctor` role (department Psychiatry) + mental-health extra tools. Alag role nahi.
   - **Counsellor / Therapist** = naya role `counsellor`, bilkul waise jaise `lawyer` role bana hua hai (profile + booking + dashboard + admin approval).
4. **Ek booking engine** jo doctor, psychiatrist aur counsellor teeno ke liye chalta hai (in-person, video, audio, chat, home visit; single session ya package).
5. **Ek backend** (`backend/src`), MindSupport ka code `backend/src/modules/mind/` me. Alag server aur alag database band.
6. **Ek frontend**: `frontend/src/mind` ka alag app (Redux, alag UI kit, alag theme) hat kar `frontend/src/features/mind/`, jo main design system, AuthContext aur react-query use kare.
7. **Safety-first**: mental-health data sabse sensitive data hai. Auth, consent, encryption, crisis flow pehle, features baad me.

## 3. Padhne ka order

| # | File | Kya milega |
|---|------|-----------|
| 00 | Ye file | Decisions, roadmap, glossary |
| 01 | `01-current-state-audit.md` | Repo ki asli haalat, bugs, proof, kya rakhna hai |
| 02 | `02-target-architecture-and-tech-stack.md` | Naya architecture, tech stack, kya hatega |
| 03 | `03-folder-structure.md` | Backend + frontend ka final folder structure |
| 04 | `04-database-and-migration.md` | Schemas, mapping, migration script |
| 05 | `05-auth-roles-permissions-privacy.md` | Login, roles, permission matrix, privacy |
| 06 | `06-booking-flow-and-logic.md` | Booking se payment tak poora flow, slot engine, packages |
| 07 | `07-session-room-and-care-delivery.md` | Session, video/chat, notes, homework, follow-up |
| 08 | `08-unified-user-dashboard.md` | Merged user dashboard, sections, pages, widgets |
| 09 | `09-counsellor-dashboard.md` | Counsellor ka poora dashboard |
| 10 | `10-psychiatrist-dashboard.md` | Psychiatrist ka poora dashboard (prescription, medicine reminders, care plans se jud kar) |
| 11 | `11-admin-console.md` | Onboarding, verification, payouts, moderation |
| 12 | `12-safety-crisis-notifications.md` | Crisis flow, SOS jodna, notification matrix, reminders |
| 13 | `13-ui-design-system-and-animations.md` | Theme, components, motion, accessibility |
| 14 | `14-implementation-guide-backend.md` | Step by step backend code |
| 15 | `15-implementation-guide-frontend-and-qa.md` | Step by step frontend code, testing, rollout |

## 4. Bade decisions (ek jagah)

| Sawal | Faisla | Kyun |
|---|---|---|
| Psychiatrist ke liye naya role? | Nahi. `doctor` + `department: 'Psychiatry'` + `mentalHealth` profile | FindMedi ke doctor tools (appointments, prescriptions, calls, earnings) pehle se hain. Psychiatrist dashboard aaj MindSupport me sirf counsellor dashboard ki copy hai (4 line ka farak) |
| Counsellor ke liye? | Naya role `counsellor` + `CounsellorProfile` | Lawyer module ka pattern (model, routes, dashboard, admin approval, earnings) copy hota hai |
| Database | Ek: `findmedi` | Do User collection = do identity. Merge karna hi asli fix hai |
| MindSupport backend server | Band. Code `backend/src/modules/mind` me | Alag port, CORS, cookie aur socket ka jhanjhat khatam |
| Auth | FindMedi `protect` + `requireRole` | Mind me abhi koi auth nahi |
| Booking model | FindMedi `Appointment` extend hoga (`serviceLine`, `providerType`, `sessionPackageId`) | Ek appointments list, ek calendar, ek reminder system |
| Packages | Naye models `SupportPackage`, `UserPackage` (mind se migrate) | FindMedi me packages ka concept nahi hai. Mind ka design achha hai, rakhte hain |
| Payments | FindMedi `Payment` (`serviceType: 'mind_session'` / `'mind_package'`) | Ek payment history, ek refund flow |
| Video / audio / chat | FindMedi ka WebRTC (`VideoCallContext`, `AudioCallContext`) + chat | Google Meet link sirf fallback |
| Realtime | FindMedi ka Socket.IO (`socketService.js`), mind ka alag socket hat jata hai | Ek socket, ek room scheme (`user:{id}`) |
| Frontend state | react-query + AuthContext. Redux sirf transition me | Repo me `@tanstack/react-query` pehle se hai |
| Notes encryption | AES-256-GCM (abhi AES-256-CBC bina MAC) | Tamper detection + key versioning |
| User dashboard | Ek: `/dashboard` + `/patient/*`. Mind ke pages `/patient/mind/*` | "Alag nahi lagna chahiye" |
| Public MindSupport pages | `/mind` landing rehta hai, but main `PublicLayout` me | Marketing alag, app ek |

## 5. Roadmap (phase wise)

**Phase 0: Security hotfix (1 din, sabse pehle)**
1. MindSupport backend ko deploy/expose mat karo jab tak auth na lage (file 01, section 3).
2. Demo seed credentials aur `admin@demo.mindsupport.com` production DB me hain to hatao.
3. FindMedi ke main socket me handshake token auth lagao (file 05, section 3.1). Client ka `userId` maanna band.
4. Cloudinary upload signature route ko login ke peeche karo ya mind server band rakho.

**Phase 1: Backend merge (1 se 2 hafte)**
1. Models `backend/src/models/mind/` me (file 04).
2. Routes `backend/src/modules/mind/` me, `protect` ke saath (file 05, 14).
3. `counsellor` role, `CounsellorProfile`, join-platform onboarding.
4. Migration script se purana `mindsupport` DB copy (file 04).
5. `backend/mindsupport/` server band.

**Phase 2: Booking (1 se 2 hafte)**
1. Slot engine, package engine, payment, cancellation (file 06).
2. Unified `/find-care` page + `BookingWizard` (file 06, 15).
3. Reminders job (file 12).

**Phase 3: User dashboard merge (1 hafta)**
1. Sidebar me "Mind & Wellness" section (file 08).
2. Wellness hub, journal, assessments, homework, packages, sessions pages.
3. `/mind/user` ko redirect.

**Phase 4: Provider dashboards (1 se 2 hafte)**
1. Counsellor dashboard (file 09).
2. Psychiatrist tools doctor dashboard me (file 10).

**Phase 5: Admin + safety (1 hafta)**
1. Admin mind console (file 11).
2. Crisis flow, SOS jodna, moderation (file 12).

**Phase 6: Cleanup**
1. `frontend/src/mind/` aur `backend/mindsupport/` delete.
2. Redux hatao, duplicate UI kit hatao (~50 files).
3. E2E tests, load test, docs.

Ye time ek developer ke andaze se hain. Do log ho to Phase 3 aur 4 saath chal sakte hain.

## 6. Glossary

| Shabd | Matlab |
|---|---|
| Provider | Wo jo care deta hai: `doctor` (psychiatrist) ya `counsellor` |
| Session | Ek appointment jo mental-health service line ka hai |
| Package | Multiple sessions ka bundle (one-time / short / medium / long term) |
| Intake form | Pehli session se pehle bhari jane wali detail (concerns, history) |
| Consent | Telehealth aur data-use ki sahmati |
| Service line | `medical` ya `mental_health`, appointment ko alag filter karne ke liye |
| Crisis flag | Message me khud ko nuksan pahunchane wale shabd milne par alert |

## 7. Conventions

1. Code English me, samjhane wali baatein Hinglish me.
2. "Repo me abhi" likha ho to maine code padh ke verify kiya hai. "Proposal" likha ho to naya design hai.
3. Sab paths repo root se hain (`backend/...`, `frontend/...`).
4. Har naya endpoint `/api/mind/...` ke neeche, taaki purane FindMedi routes se na takraye.

## 8. Medical disclaimer (product me dikhana hai)

Ye platform therapy ya emergency service ka replacement nahi hai. Har mental-health page ke footer me ye dikhe: "Agar aap turant khatre me hain to 112 par call karein ya Tele-MANAS 14416 (24x7, free)." Helpline numbers release se pehle ek baar official source se verify kar lena, kyunki numbers badal sakte hain.


# 01 — Current State Audit (repo ki asli haalat)

Commit: `df7f20d`. Sab kuch code padh ke likha hai. Jahan chalake dekhna ho wahan curl commands diye hain.

---

## 1. Summary table

| # | Problem | Kitna bada | Proof |
|---|---------|-----------|-------|
| 1 | MindSupport backend me **koi authentication nahi** | P0, security + functionality | Section 3 |
| 2 | Do backend, do port, do database | P0 | Section 2 |
| 3 | Do user system (FindMedi `User` aur mind `User`) | P0 | Section 4 |
| 4 | Do booking + do payment + do notification system | P1 | Section 5 |
| 5 | Do dashboard, alag sidebar, alag theme | P1 | Section 6 |
| 6 | Psychiatrist dashboard = counsellor dashboard ki copy | P1 | Section 7 |
| 7 | 48 UI components ki duplicate library, Redux alag | P2 | Section 8 |
| 8 | Notes encryption kamzor (CBC, fallback key) | P1 (privacy) | Section 9 |
| 9 | Production me frontend purane Render server ko call karta hai | P1 | Section 10 |
| 10 | Demo passwords aur seed data | P1 | Section 11 |
| 11 | **FindMedi ka apna socket bhi client ka `userId` maan leta hai** (mind merge se pehle fix zaroori) | P0 | Section 14 |

---

## 2. Architecture: do alag system

**Repo me abhi:**
- Main API: `backend/src/index.js`, database `findmedi` (`MONGO_URI`).
- MindSupport API: `backend/mindsupport/server.js`, alag `express()` app, alag `httpServer`, alag `socket.io` server, port `MIND_PORT` (default **8089**), database default `mongodb://127.0.0.1:27017/mindsupport`.
- `package.json` scripts: `dev:mind` / `start:mind` alag chalane padte hain (`node mindsupport/server.js`).
- Frontend `frontend/src/mind/lib/api.js`: localhost par `http://localhost:8089` call karta hai. Alag origin = alag CORS, alag cookie domain, alag socket connection.
- `frontend/src/mind/lib/socket.js` MindSupport ke server se socket jodta hai, FindMedi ke socket se nahi. Isliye ek user ko do notification stream milti hain.
- `backend/mindsupport/src/config/env.js` me `dns.setServers(["8.8.8.8","1.1.1.1"])` process-wide set hota hai. Main backend me pehle se `configureMongoDns()` hai. Merge me ise copy nahi karna (do jagah DNS override takrayega).

**Nateeja:** deploy me do services, do env files, do health-check, do log stream. Ek fail ho to dusra chalta dikhta hai par app adhura kaam karta hai.

---

## 3. P0: MindSupport me authentication hai hi nahi

`backend/mindsupport/src/app.js` (lines ~260 se):
```js
// Auth removed: MindSupport is now part of the FindMedi platform...
async function authOptional(_req, _res, next) { next(); }
async function authRequired(_req, _res, next) { next(); }
function requireRoles(..._allowed) { return (_req, _res, next) => { next(); }; }
```
Teeno guards khali hain. Kahin bhi `req.user` set nahi hota (poore `backend/mindsupport` me `req.user =` search karo, ek bhi match nahi).

### 3.1 Ye kyu tootta hai (functionality)
Handlers me `req.user` 200 se zyada lines me use hota hai (`marketplace.routes.js` 33, `communication.routes.js` 40, `counsellor.routes.js` 29, `user.routes.js` 20, `wellness.routes.js` 20, `packages.routes.js` 20 ...). `req.user` undefined hai, to `req.user._id` TypeError deta hai aur request 500 hoti hai.

Isliye **`/mind/user` ka dashboard, booking, packages, messages, journal, counsellor dashboard** sab kaam nahi karte. Ye hi wo "flow bigad gaya" hai jo tum dekh rahe ho.

### 3.2 Ye khatarnak kyu hai (privacy)
Do tarah ke routes hain:
1. Jo handler `req.user` chhute hain: 500 dete hain (toote hue, par data leak nahi).
2. Jo handler `req.user` chhute hi nahi: guard "on paper" hai par asal me **kisi ke liye bhi khule hain**.

Maine har route ko script se check kiya. Ye **20 routes abhi bina login ke chalte hain**, jinme se 16 "admin only" hone chahiye the:

| Route | Kya kar sakta hai koi bhi anjaan |
|---|---|
| `GET /api/admin/users` | Saare users (naam, email, role) ki list |
| `POST /api/admin/users` | Naya admin/counsellor user bana do |
| `PATCH /api/admin/users/:id` | Kisi ka role/status badal do (khud ko admin bana lo) |
| `GET /api/admin/counsellor-applications` | Counsellors ki applications (documents links ke saath) |
| `PATCH /api/admin/therapist-verification/:id` | Kisi bhi therapist ko approve/reject karo |
| `GET/POST/PATCH/DELETE /api/admin/packages...` | Packages aur pricing badlo/delete karo |
| `POST /api/admin/notifications` | Sabko notification bhejo |
| `GET /api/admin/analytics/sessions`, `GET /api/analytics*` | Revenue/session analytics |
| `GET /api/reports/counsellor` | Counsellors ke khilaf user complaints |
| `GET /api/upload/signature`, `POST /api/upload/image` | Tumhare Cloudinary account me koi bhi file upload kare |
| `POST /api/wellness/notification`, `POST /api/peer/posts/:id/vote` | Spam / vote manipulation |

Socket: `realtime/socket.js` `socket.handshake.auth.userId` client se leta hai aur us user ke `user:{id}` room me daal deta hai. Kisi ka bhi `userId` bhej ke uski realtime private updates sun sakte ho.

Mental-health platform ke liye user list, verification approve karna aur upload signature ka khula hona sabse gambhir hai.

Ye list dobara nikalne ki script `14-implementation-guide-backend.md` ke "verification" section me hai.

### 3.3 Khud confirm karo
Mind backend chalao (`npm run dev:mind`), phir:
```
curl -i http://localhost:8089/api/user/dashboard
```
Expected (abhi): `500` (ya crash message, `Cannot read properties of undefined (reading '_id')`).
```
curl -i http://localhost:8089/api/admin/users
```
Expected (abhi): `200` aur saare users ki list, bina token ke. Ye asli leak hai.

### 3.4 Turant karne wala (Phase 0)
Jab tak merge poora na ho: MindSupport server ko public internet par mat chalao. Local ya private network par hi rakho.

---

## 4. Do user system

| | FindMedi `User` | Mind `User` |
|---|---|---|
| File | `backend/src/models/User.js` | `backend/mindsupport/src/models/index.js` |
| Roles | `superadmin, hospital_admin, doctor, clinic_doctor, patient, lab_*, pharmacy_*, delivery_boy, rider, assistant, lawyer, ambulance ...` | `user, counsellor, admin` |
| Password | `password` (bcrypt) | `passwordHash` |
| Extra | facility, hospital, address | counsellor ka poora profile *usi* User doc me: pricing, packages, license, availability, meetLink ... |
| Auth | JWT (cookie `token` ya `Authorization`) | (removed) |

Problems:
1. Ek insaan ke do account ban sakte hain (patient FindMedi me, aur mind me alag). Email unique dono jagah alag-alag.
2. Counsellor ka profile aur login ek hi document me thoosa hua hai. FindMedi me pattern alag hai (`User` + `Doctor` / `LawyerProfile` / `AssistantProfile`).
3. Mind me `psychiatrist` role hi nahi. `Psychiatrists.jsx` page `api.getDoctors()` se FindMedi ke `Doctor` collection se data leta hai (seed: `backend/seed-psychiatrists.mjs`, department `Psychiatry`). Yaani psychiatrists FindMedi ke hain, counsellors mind ke.

---

## 5. Do booking, do payment, do notification, do chat

| Cheez | FindMedi | MindSupport |
|---|---|---|
| Appointment | `Appointment` (Pending/Confirmed/..., modes: chat, video, audio, offline, home ...), `BookingModal.tsx` 1053 lines, slot engine `doctors.js`, `GET /appointments/booked-slots` | `Appointment` (`student`, `counsellor`, `mode: google-meet/online/in-person/voice-call/chat-only/video-chat`) |
| Payment | `Payment` model + `demoPayment.js` | `Payment` alag model, `POST /api/payments/session` |
| Notification | `Notification` (String `userId`), `NotificationContext` | `Notification` alag (`user` ObjectId), Redux `notificationsSlice` |
| Chat | `chat.js`, `/patient/chat` | `Message` model, `/api/messages` |
| Reviews | `Review` | `Review` (professionalism, helpfulness, communication) |
| Video | WebRTC via Socket.IO (`VideoCallContext`, `AudioCallContext`) | Google Meet link (`meetingLink`, `/api/meet/create`) |

Psychiatrist book karne par FindMedi ka flow chalta hai, counsellor par mind ka. Ek user ko "My appointments" me sirf ek hi type dikhta hai.

---

## 6. Do dashboard

- FindMedi patient: `/dashboard`, `/patient/*`, sidebar `AppSidebar.tsx` (30 se zyada items).
- MindSupport user: `/mind/user`, `MindSidebar.tsx`, `MindDashboardLayout.tsx`, tabs: home, wellness, packages, sessions, schedule, history, prescriptions (Treatment), assignments, journal, settings.
- `App.tsx` ka comment khud kehta hai: "FindMedi user dashboard and MindSupport user dashboard stay separate on purpose (merge later)". Ye "later" ab hai.
- Mind routes ek alag `MindShell` provider ke andar (`/mind/*`), jisme apna Redux `Provider`, `ThemeProvider`, `LanguageProvider`, `Toaster` hain. Yaani do theme systems, do language systems, do toast systems.

---

## 7. Psychiatrist dashboard sirf copy hai

```
mind/pages/CounsellorDashboard.jsx   3015 lines
mind/pages/PsychiatristDashboard.jsx 3015 lines
diff between them: 4 lines
```
Tabs dono me wahi: overview, sessions (pending/confirmed/completed/cancelled), schedule, patients, notes, earnings, resources, reviews, history, settings. Psychiatrist ke liye koi psych-specific cheez nahi: na prescription workflow, na medication review, na treatment plan, na risk assessment. Backend me `prescriptions` aur `assignments` routes hain par psychiatrist UI unhe use nahi karta.

Admin dashboard (`AdminDashboard.jsx`, 2866 lines) tabs: overview, users, counsellors, applications, revenue, refunds, emergency, reports, analytics, exports, security. Ye rakhne layak hai, bas FindMedi ke admin ke andar jana chahiye.

---

## 8. Frontend duplication

- `frontend/src/mind/components/ui/` me **48 files**, aur `frontend/src/components/ui/` me 50. **Sabhi 48 naam duplicate hain** (button, dialog, tabs, ...). Do alag versions maintain karne padte hain.
- Mind pages total **19,352 lines**. Sabse bade: CounsellorDashboard 3015, PsychiatristDashboard 3015, UserDashboard 2830, AdminDashboard 2866. Ek file me 3000 lines = review, test aur reuse mushkil.
- Redux store: 5 slices (`counsellors, notifications, packages, revenue, ui`). FindMedi ke baaki app me Redux use hi nahi hota (react-query hai).
- Sirf `App.tsx` mind ko import karta hai, matlab code alag island me hai, kuch shared nahi.

---

## 9. Encryption aur privacy

`backend/mindsupport/src/app.js`:
1. Algorithm `aes-256-cbc` (bina authentication tag). Data chhed-chhad ho to pata nahi chalta.
2. Key: `NOTES_ENCRYPTION_KEY || JWT_SECRET || "mindsupport-fallback-key-2024"`. Env na ho to hard-coded fallback. JWT secret rotate karo to purane notes padhe nahi jate.
3. `decryptText` fail hone par **original text wapas** deta hai (`catch { return text; }`), yaani galat key ya corrupt data chupke se pass ho jata hai.
4. Key version ka koi concept nahi, rotation mumkin nahi.
5. Rakhne layak: anonymous mode (`isAnonymous`, alias), `consentGiven`, `dataEncryptionEnabled` jaise fields. Design achha hai, implementation kamzor.

---

## 10. Production API base

`frontend/src/mind/lib/api.js`:
```js
const DEPLOYED_API_BASE = "https://mindsupport-uqms.onrender.com";
function defaultApiBase() {
  if (localhost) return "http://localhost:8089";
  if (port === "8080") return "";
  if (hostname === "mindsupport-uqms.onrender.com") return "";
  return DEPLOYED_API_BASE;      // <- kisi bhi aur domain par
}
```
Yaani FindMedi ko kisi bhi production domain par deploy karo, mind pages **purane alag MindSupport Render server** se baat karenge, us server ki apni database aur (shayad) alag auth ke saath. Merge ke baad ye nahi chalega, mind calls `/api/mind/*` par jani chahiye, main API ke saath.

---

## 11. Seed aur demo data

`backend/mindsupport/scripts/seed-demo.js`, `seed-counsellors.js`: known passwords (`Counsellor@123`), admin `admin@demo.mindsupport.com`. Ye production DB me hain to turant hatao ya password badlo.

---

## 12. Kya achha hai (rakhna hai)

| Feature | Kahan | Merge me |
|---|---|---|
| Support packages (one-time, short, medium, long term), sessionsTotal/Used, cadence, expiry, refund | `SupportPackage`, `UserPackage`, `packages.routes.js` | Rakho, FindMedi models me shift |
| Intake form + consent per package | `IntakeForm`, `ConsentForm` | Rakho |
| Encrypted therapy notes, anonymous mode | `Appointment.notesEncrypted`, `isAnonymous` | Rakho, GCM me upgrade |
| Mood, journal, goals, assessment (PHQ/GAD jaise) | `MoodEntry`, `Journal`, `WellnessGoal`, `Assessment` | Rakho, user dashboard ka hissa |
| Homework/assignments, psychiatrist prescriptions | `Assignment`, `Prescription` | Rakho, prescriptions FindMedi ke `Prescription` se jodo |
| Peer support with moderation | `PeerPost/Comment/Report` | Rakho, moderation admin console me |
| Resource hub | `Resource`, YouTube integration | Rakho |
| Counsellor application + verification | `CounsellorApplication`, admin routes | Rakho, Join Platform onboarding se jodo |
| Counsellor reports (user complaints) | `CounsellorReport` | Rakho |
| Crisis keyword flag | `crisisRegex` | Rakho, upgrade (file 12) |
| Custom packages/pricing per counsellor | `customPackages`, `supportPlanPrices` | Rakho. Note: FindMedi `Doctor` me `supportPlanPrices` pehle se hai |

---

## 13. Impact (kya toot raha hai user ko)

1. User `/mind/user` kholta hai: data nahi aata ya error.
2. Counsellor book karta hai: FindMedi ke "My appointments" me nahi dikhta.
3. Psychiatrist book karta hai: mind ke "Sessions" me nahi dikhta.
4. Payment history do jagah, refund do jagah.
5. Notification bell FindMedi ki, mind ki alag, dono me alag cheezein.
6. Theme/language mind me alag reset ho jata hai.

Ye saari cheezein file 02 se 15 me fix hoti hain.

---

## 14. FindMedi ke main socket ki bhi wahi kamzori

Ye mind ka nahi, main app ka issue hai, par merge me mind ke crisis/session events isi socket se jayenge, isliye zaroori hai.

`backend/src/services/socketService.js`:
```js
socket.on('join', async (payload) => {
  const userId = typeof payload === 'object' ? payload?.userId : payload;
  if (userId) { socket.userId = String(userId); socket.join(`user:${userId}`); ... }
});
```
Koi token verify nahi hota. Client jo `userId` bheje wahi room join ho jata hai. Yaani koi bhi kisi ka bhi `userId` (jo kai URLs/API responses me dikhta hai) bhej ke uski notifications aur realtime events (SOS, calls, chat) sun sakta hai. Fix `05-auth-roles-permissions-privacy.md`, section 3.1 me hai (handshake token auth). Ye Phase 0 me karo.

# 02 — Target Architecture + Tech Stack

## 1. Principles

1. **Ek hi identity**: FindMedi `User` sabka account. Mind ka alag user nahi.
2. **Reuse over rewrite**: jo FindMedi me pehle se hai (slot engine, WebRTC, payments, notifications, sidebar shell, react-query, shadcn UI) wahi use hoga. Mind ke sirf wo hisse aayenge jo FindMedi me nahi hain (packages, intake/consent, encrypted notes, mood/journal/assessment, peer support, homework).
3. **Modular monolith**: ek Express app, andar `modules/mind` ek clean module. Microservice nahi. Team chhoti hai, deploy simple rahe.
4. **Privacy by default**: har mind route login ke peeche, har read audit-log hota hai, sensitive fields encrypted.
5. **Strangler migration**: purana `/mind/*` ek dam delete nahi hota. Naye routes bante hain, purane redirect hote hain, phir code hatta hai.
6. **Ek dikhne wala product**: user ko kahin "ye mind app hai" jaisa switch na dikhe. Ek sidebar, ek notification bell, ek appointments list.

---

## 2. Target architecture (text me)

**Client (browser, ek React app)**
- Shell: `DashboardLayout` + `AppSidebar` (role-based menu).
- Features: `features/mind/*` (user pages, provider pages, admin pages, booking wizard).
- Data: react-query (`useQuery`, `useMutation`), ek axios client (`lib/axios.js`), ek `AuthContext`.
- Realtime: ek Socket.IO connection (existing `NotificationContext` / call contexts).

**API (ek Express app, `backend/src/index.js`)**
- Existing routers (`/api/appointments`, `/api/doctors`, `/api/payments`, `/api/lawyers` ...).
- Naya router group `/api/mind/*` (`backend/src/modules/mind/`):
  - `providers` (counsellor + psychiatrist discovery)
  - `availability` (slots)
  - `bookings` (session booking, reschedule, cancel)
  - `packages` (catalog, purchase, usage, refund)
  - `intake` and `consent`
  - `sessions` (lifecycle: join, notes, end)
  - `wellness` (mood, journal, goals, assessments)
  - `treatment` (homework, psychiatric prescriptions, treatment plans)
  - `peer` and `resources`
  - `safety` (crisis, safety plan)
  - `provider` (counsellor self-service: profile, availability, earnings)
  - `admin` (verification, moderation, analytics)

**Data (ek MongoDB `findmedi`)**
- Existing collections + naye mind collections (file 04).

**Realtime (ek Socket.IO server, `socketService.js`)**
- Rooms: `user:{userId}`, `appointment:{appointmentId}` (session room), `role:{role}`.
- Naye events sirf `mind:` prefix ke saath.

**Jobs (ek scheduler process ya same process)**
- Reminders, package expiry, no-show sweeper, crisis re-check, weekly wellness digest.

**Files**
- Cloudinary (existing `cloudinary` dependency) signed upload, ab login ke peeche.

---

## 3. Tech stack

### 3.1 Jo rehta hai (FindMedi ka)
| Layer | Tech | Note |
|---|---|---|
| Frontend | React 18, Vite, TypeScript (tsx) | Naye files `.tsx` me |
| Routing | react-router-dom v6 (HashRouter, as-is) | |
| Styling | Tailwind CSS 3, shadcn/ui (Radix) | `components/ui` hi use hoga |
| Animation | framer-motion 12 | file 13 |
| Charts | recharts 3 | mood/vitals charts |
| Data fetching | @tanstack/react-query 5 | Redux ki jagah |
| Forms | react-hook-form + zod | intake/consent/booking |
| Dates | date-fns 3 | |
| Toasts | sonner | Mind ke dono toaster hatenge |
| Backend | Node, Express 4, Mongoose 8 | |
| Auth | JWT (`protect`, `requireRole`) | |
| Validation | zod (backend `validate.js`) | |
| Security | helmet, express-rate-limit | |
| Realtime | socket.io 4 | |
| Calls | WebRTC via socket signalling | `VideoCallContext`, `AudioCallContext` |
| Files | cloudinary, multer | |
| PDF | pdfkit | prescription/invoice |
| Cache/Queue | redis (optional, already in deps) | |

### 3.2 Naya jo add hoga (chhota)
| Package | Kahan | Kyu |
|---|---|---|
| `node-cron` | backend | Reminders, expiry, no-show job. Redis na ho tab bhi chalta hai. (Scale par BullMQ) |
| `ics` | backend | Booking confirmation ki calendar file |
| `isomorphic-dompurify` (ya `sanitize-html`) | backend | Journal/peer post sanitization (mind me `sanitize.js` frontend par hai, server par bhi chahiye) |
| `libphonenumber-js` (optional) | frontend | Emergency contact phone validation |

Baaki sab already hai. Koi bhari dependency nahi.

### 3.3 Jo hatega
| Kya | Kahan | Kab |
|---|---|---|
| `backend/mindsupport/` poora | server, models, routes, socket, scripts | Phase 1 ke baad |
| `frontend/src/mind/components/ui/*` (48 duplicate files) | | Phase 6 |
| `frontend/src/mind/store/*` (Redux) | | Phase 6 |
| `frontend/src/mind/contexts/*` (Theme, Language) | main wale use honge | Phase 3 |
| `frontend/src/mind/lib/api*.js`, `socket.js` | main client use hoga | Phase 3 |
| `MindProviders.jsx`, `MindDashboardLayout.tsx`, `MindSidebar.tsx` | | Phase 3 |
| `react-redux`, `@reduxjs/toolkit` (agar aur kahin use na ho) | package.json | Phase 6 |
| Hard-coded `dns.setServers` (mind env.js) | | Phase 1 (copy nahi karna) |
| `DEPLOYED_API_BASE` (`mindsupport-uqms.onrender.com`) | | Phase 3 |

---

## 4. Backend module rules

1. Har route file ek `Router` export karta hai. `index.js` me:
```js
import mindRoutes from './modules/mind/index.js';
app.use('/api/mind', mindRoutes);   // mindRoutes ke andar router.use(protect) hai
```
2. `modules/mind/index.js`:
```js
import express from 'express';
import { protect } from '../../middleware/auth.js';
import { auditReads } from './middleware/auditReads.js';
const router = express.Router();

router.use(protect);          // <- ek jagah auth, koi route bina login ke nahi
router.use(auditReads);       // sensitive resources ka access log

router.use('/providers',   providersRoutes);
router.use('/availability',availabilityRoutes);
router.use('/bookings',    bookingsRoutes);
router.use('/packages',    packagesRoutes);
router.use('/intake',      intakeRoutes);
router.use('/consent',     consentRoutes);
router.use('/sessions',    sessionsRoutes);
router.use('/wellness',    wellnessRoutes);
router.use('/treatment',   treatmentRoutes);
router.use('/peer',        peerRoutes);
router.use('/resources',   resourcesRoutes);
router.use('/safety',      safetyRoutes);
router.use('/provider',    providerSelfRoutes);   // counsellor self-service
router.use('/admin',       adminRoutes);          // andar restrictTo('superadmin','hospital_admin'?)
export default router;
```
Public discovery ke liye alag: `app.use('/api/public/mind', publicMindRoutes)` (sirf verified providers ki safe fields; koi PHI nahi).

3. **Layering**: `routes (HTTP) -> validators (zod) -> policies (kaun kya kar sakta hai) -> services (business logic) -> models`. Route me business logic nahi.
4. **Error format** ek jaisa:
```json
{ "success": false, "code": "SLOT_TAKEN", "message": "Ye slot abhi kisi aur ne le liya" }
```
5. **Pagination**: `?page=1&limit=20`, response `{ items, page, limit, total }`.
6. **Idempotency**: payment aur booking POST me `Idempotency-Key` header, duplicate double-click se bachne ke liye.
7. **Time**: naya data UTC `Date` me (`startAt`, `endAt`), display IST (`Asia/Kolkata`). Purane `Appointment.date` (string) aur `time` ("09:00 AM") compatibility ke liye bhi bharte rahenge (file 06).

---

## 5. API versioning aur compatibility

- Naya: `/api/mind/*`.
- Purane mind paths (`/api/counsellors`, `/api/appointments` mind wale, `/api/packages/...`) **nahi** rakhte, kyunki purane server ka client ab hat jayega.
- Frontend feature flag: `VITE_MIND_ENABLED=true`. Backend `MIND_ENABLED=true`. Band karne par `/api/mind` 404 aur sidebar section hidden.

---

## 6. Env variables (ek `.env`)

`backend/.env` me add:
```
# MindSupport (merged)
MIND_ENABLED=true
MIND_NOTES_KEY_CURRENT=v1
MIND_NOTES_KEY_V1=<64 hex chars, 32 bytes>          # openssl rand -hex 32
MIND_SLOT_HOLD_MINUTES=5
MIND_REMINDER_OFFSETS=1440,60,10                     # minutes before session
MIND_DEFAULT_COMMISSION_PCT=20
MIND_CRISIS_HELPLINES_JSON=[{"name":"Tele-MANAS","number":"14416"},{"name":"Emergency","number":"112"}]
```
Hata do (ab zarurat nahi): `MIND_PORT`, alag `MONGODB_URI` for mindsupport, `CORS_ORIGIN` mind wala, `GOOGLE_MEET_DEFAULT_LINK` (sirf fallback ke liye rakh sakte ho).

`frontend/.env`: `VITE_MIND_ENABLED=true`. `VITE_API_BASE_URL` sirf ek (main API).

Secrets kabhi hard-code nahi (mind me `mindsupport-fallback-key-2024` jaisa fallback nahi). Key na ho to server start hi fail kare.

---

## 7. Realtime rules

- Ek socket connection. Auth handshake `token` se (main `socketService` jaisa), `userId` client se nahi.
- Rooms: `user:{id}` (personal), `appointment:{id}` (sirf patient + provider), `role:counsellor` (admin broadcast).
- Events:

| Event | Kisko | Kab |
|---|---|---|
| `mind:booking_requested` | provider | Naya booking request |
| `mind:booking_status` | patient | Confirm/decline/cancel |
| `mind:session_starting` | dono | 10 minute pehle |
| `mind:session_joined` | dono | Koi room me aaya |
| `mind:session_ended` | dono | Session khatam |
| `mind:message` | dono | Secure chat |
| `mind:crisis_alert` | on-call provider + admin | Crisis flag |
| `mind:homework_assigned` | patient | Naya homework |
| `mind:package_low` | patient | 1 session bacha |

---

## 8. Performance aur reliability targets

| Metric | Target |
|---|---|
| Slots API | p95 < 300 ms (index: providerId + startAt) |
| Provider search | p95 < 400 ms (text + filter index) |
| Booking POST | p95 < 800 ms, double booking impossible (unique index) |
| Dashboard first load | < 2.5 s on 4G (lazy routes, route-level code split) |
| Session join | < 3 s |
| Availability | reminder job miss < 0.1% |

---

## 9. Observability aur audit

1. Har sensitive read/write ka `AuditLog` (existing `middleware/audit.js` reuse): who, what, which patient, when, IP.
2. Sensitive = therapy notes, intake, journal (provider-view), crisis events, prescriptions.
3. Log me kabhi note ka text nahi, sirf ids.
4. Crisis events ka alag alert channel (admin notification + email).

---

## 10. Testing strategy

| Type | Tool | Kya |
|---|---|---|
| Unit | jest (backend already) | slot engine, package usage, refund calc, crypto |
| API | jest + supertest | permission matrix (file 05) har route par |
| Component | vitest (frontend already) | BookingWizard steps, mood widget |
| E2E | Playwright (naya, optional) | Booking se session tak |
| Load | k6/autocannon | Slots aur booking |
| Security | manual checklist | IDOR, role bypass, upload |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Data migration me galti | Dry-run mode, id-map collection, backup pehle (file 04) |
| Purane users ke passwords (mind `passwordHash`) | Same bcrypt hash copy ho jata hai; email match par existing FindMedi user se merge |
| Slot double booking | Unique partial index + atomic hold (file 06) |
| Web push nahi to reminders miss | In-app + email + SMS-ready abstraction (file 12) |
| Crisis message ka late response | Escalation timers, on-call rota, helpline always visible |

# 03 — Final Folder Structure

Tree yaha sirf files ki jagah dikhane ke liye hai (koi flow diagram nahi).

---

## 1. Backend (final)

```
backend/
  src/
    index.js                        # app.use('/api/mind', mindRoutes) yahan jodna hai
    config/
      mongoDns.js                   # existing (mind ka dns.setServers copy NAHI karna)
      mind.js                       # mind env parsing + validation (keys, offsets)
    middleware/
      auth.js                       # existing protect, requireRole, restrictTo
      audit.js                      # existing
    models/
      User.js                       # role enum me 'counsellor' add
      Doctor.js                     # + mentalHealth {...} sub-doc (psychiatrist)
      Appointment.js                # + serviceLine, providerType, startAt/endAt, packageId ...
      Payment.js                    # serviceType enum me 'mind_session','mind_package'
      Notification.js               # existing
      mind/
        CounsellorProfile.js
        SupportPackage.js
        UserPackage.js
        IntakeForm.js
        ConsentForm.js
        SessionNote.js              # encrypted, provider-only
        MoodEntry.js
        JournalEntry.js
        WellnessGoal.js
        Assessment.js
        Assignment.js               # homework
        PsychRxMeta.js              # psychiatrist prescription extras (link to Prescription)
        TreatmentPlan.js            # ya ChronicCarePlan extend (file 10)
        SafetyPlan.js
        CrisisEvent.js
        PeerPost.js
        PeerComment.js
        PeerReport.js
        MindResource.js
        ProviderReport.js           # user complaints
        SlotHold.js                 # 5 min checkout hold (TTL index)
        MindMessage.js              # secure chat history
        MindLegacyIdMap.js          # migration id mapping
    modules/
      mind/
        index.js                    # router, protect + audit
        middleware/
          auditReads.js
          requireProvider.js        # counsellor ya psychiatrist check
          requireConsent.js
        routes/
          providers.routes.js
          availability.routes.js
          bookings.routes.js
          packages.routes.js
          intake.routes.js
          consent.routes.js
          sessions.routes.js
          wellness.routes.js
          treatment.routes.js
          peer.routes.js
          resources.routes.js
          safety.routes.js
          providerSelf.routes.js
          admin.routes.js
          public.routes.js          # /api/public/mind (no PHI)
        services/
          slotEngine.js
          bookingService.js
          packageService.js
          pricingService.js
          refundService.js
          sessionService.js
          crisisService.js
          reminderService.js
          assessmentScoring.js      # PHQ-9, GAD-7, ...
          matchService.js           # concern-based provider matching
          earningsService.js
        policies/
          access.js                 # canViewNotes, canViewIntake, canViewJournal ...
        validators/
          booking.schema.js
          intake.schema.js
          wellness.schema.js
          ...                       # zod
        lib/
          crypto.js                 # AES-256-GCM, key versioning
          sanitize.js
          time.js                   # IST helpers
          ics.js
    jobs/
      index.js                      # cron registry (node-cron)
      reminders.job.js
      packageExpiry.job.js
      noShowSweeper.job.js
      slotHoldCleanup.job.js
      weeklyDigest.job.js
    services/
      socketService.js              # existing, mind rooms/events yahan add
  scripts/
    mind/
      migrate-from-mindsupport.mjs  # file 04
      verify-migration.mjs
      seed-mind-demo.mjs            # naya demo seed (known password NAHI)
      audit-open-routes.mjs         # file 14 me
  test/
    mind/
      slotEngine.test.js
      packages.test.js
      permissions.test.js
      crypto.test.js
      booking.e2e.test.js
  mindsupport/                      # <-- Phase 1 ke baad DELETE
```

---

## 2. Frontend (final)

```
frontend/src/
  App.tsx                           # sirf <MindRoutes /> import, 15 line ke andar
  routes/
    mindRoutes.tsx                  # saare mind routes ek jagah (lazy)
  components/
    AppSidebar.tsx                  # 'mind' group + counsellor menu yahan
    ui/                             # SIRF ek UI kit (shadcn)
  features/
    mind/
      api/
        client.ts                   # main axios instance ka wrapper
        queryKeys.ts
        providers.ts                # useProviders, useProvider
        availability.ts             # useSlots, useHoldSlot
        bookings.ts                 # useCreateBooking, useCancel, useReschedule
        packages.ts
        wellness.ts
        sessions.ts
        treatment.ts
        safety.ts
        peer.ts
        provider.ts                 # counsellor self-service
        admin.ts
      types/
        provider.ts booking.ts package.ts wellness.ts session.ts
      components/
        ProviderCard.tsx
        ProviderFilters.tsx
        SlotPicker.tsx
        ModeSelector.tsx
        PackageCard.tsx
        PriceSummary.tsx
        SessionCard.tsx
        MoodSlider.tsx
        AssessmentRunner.tsx
        CrisisBanner.tsx
        HelplineSheet.tsx
        StatTile.tsx
        EmptyState.tsx
      booking/
        BookingWizard.tsx
        steps/
          ChooseService.tsx
          ChooseSlot.tsx
          Screening.tsx
          Intake.tsx
          Consent.tsx
          Review.tsx
          Payment.tsx
          Done.tsx
        useBookingMachine.ts        # step state
      find/
        FindMindCare.tsx            # tabs: Counsellors | Psychiatrists
        ProviderProfile.tsx         # dono ke liye
      user/                         # patient ke mind pages
        MindHome.tsx                # dashboard widget + /patient/mind
        MySessions.tsx
        MySchedule.tsx
        MyPackages.tsx
        Wellness.tsx  Journal.tsx  Mood.tsx  Assessments.tsx  Goals.tsx
        Homework.tsx  Treatment.tsx  SafetyPlan.tsx
        Resources.tsx  PeerSupport.tsx
        MindSettings.tsx
      session/
        SessionRoom.tsx             # video/audio/chat, existing call contexts
        PreSessionCheck.tsx
        PostSession.tsx
        SessionChat.tsx
      counsellor/                   # role: counsellor
        CounsellorDashboard.tsx     # tabs router (?tab=)
        tabs/ Overview.tsx Requests.tsx Sessions.tsx Schedule.tsx Clients.tsx
              Notes.tsx Homework.tsx Packages.tsx Earnings.tsx Resources.tsx
              Reviews.tsx Profile.tsx Verification.tsx Settings.tsx
      psychiatrist/                 # doctor role, department Psychiatry
        PsychiatristTools.tsx       # doctor dashboard me extra tabs
        MedicationReview.tsx  RxWriter.tsx  Assessments.tsx  RiskFlags.tsx
        TreatmentPlanEditor.tsx
      admin/
        MindAdminHome.tsx  ProviderApprovals.tsx  Packages.tsx  Payouts.tsx
        Refunds.tsx  Moderation.tsx  CrisisMonitor.tsx  Analytics.tsx  Exports.tsx
      lib/
        constants.ts  format.ts  guards.ts  ics.ts
  pages/
    mind/
      MindLanding.tsx               # public /mind (PublicLayout ke andar)
      MindAbout.tsx  MindPrivacy.tsx
  mind/                             # <-- Phase 6 me DELETE (purana island)
```

---

## 3. Purane files ka naye files me mapping

| Purana (`frontend/src/mind/...`) | Naya | Note |
|---|---|---|
| `pages/Index.jsx` | `pages/mind/MindLanding.tsx` | Public landing, `PublicLayout` me |
| `pages/About.jsx`, `PrivacyPolicy.jsx` | `pages/mind/MindAbout.tsx`, `MindPrivacy.tsx` | |
| `pages/Counselling.jsx` (1551 lines) | `find/FindMindCare.tsx` + `booking/*` | Listing aur booking alag |
| `pages/Psychiatrists.jsx` | `find/FindMindCare.tsx` (tab) | Same page ka doosra tab |
| `pages/PsychiatristDetail.jsx` | `find/ProviderProfile.tsx` | Counsellor + psychiatrist dono ke liye |
| `pages/ConfidentialBooking.jsx` | `booking/steps/*` (anonymous option) | |
| `pages/IntakeFormPage.jsx` | `booking/steps/Intake.tsx` | |
| `pages/SessionSchedule.jsx` | `user/MySchedule.tsx` | |
| `pages/MyWellness.jsx` | `user/Wellness.tsx` + `Mood.tsx` | |
| `pages/ResourceHub.jsx` | `user/Resources.tsx` | |
| `pages/PeerSupport.jsx` | `user/PeerSupport.tsx` | |
| `pages/UserDashboard.jsx` (2830) | `user/*` (10 chhote pages) | Home/Wellness/Packages/Sessions/Schedule/History/Treatment/Homework/Journal/Settings |
| `pages/CounsellorDashboard.jsx` (3015) | `counsellor/tabs/*` | Har tab alag file |
| `pages/PsychiatristDashboard.jsx` (3015) | **delete** | Psychiatrist = doctor dashboard + `psychiatrist/*` |
| `pages/AdminDashboard.jsx` (2866) | `admin/*` | Admin sidebar ke andar |
| `components/MoodTracker.jsx` | `components/MoodSlider.tsx` | |
| `components/ScreeningForm.jsx` | `components/AssessmentRunner.tsx` | |
| `components/EmergencySupport.jsx` | `components/CrisisBanner.tsx` + `HelplineSheet.tsx` | |
| `components/HomeSupportFlow.jsx`, `Hero.jsx`, `Features.jsx`, `WhyMindSupport.jsx`, `TalkSection.jsx`, `PlatformFeatures.jsx`, `AdvancedFeatures.jsx`, `CallToAction.jsx`, `Footer.jsx`, `Navigation.jsx` | `pages/mind/MindLanding.tsx` ke sections | Sirf marketing landing ke liye, dashboard me nahi |
| `components/reactbits/*` (FlowingMenu, SplitText, BlurText, ElectricBorder, ScrollVelocity, GlowPanel) | `components/mind-fx/` (sirf landing par) | Animation flair landing tak seemit |
| `components/ui/*` (48) | **delete** | `components/ui` use hoga |
| `store/*` (Redux) | **delete** | react-query |
| `contexts/ThemeContext, LanguageContext` | **delete** | Main context |
| `lib/api.js`, `apiAxios.js`, `socket.js` | **delete** | Main client |
| `lib/sanitize.js` | `features/mind/lib/sanitize.ts` | Rakho |

| Purana backend (`backend/mindsupport/src/...`) | Naya (`backend/src/...`) |
|---|---|
| `app.js` (helpers: crypto, crisisRegex, normalizeAppointment) | `modules/mind/lib/crypto.js`, `services/crisisService.js`, serializers |
| `models/index.js` (579 lines, 20 models) | `models/mind/*.js` (ek file ek model) |
| `routes/marketplace.routes.js` | `providers`, `bookings`, reviews (existing) |
| `routes/packages.routes.js` | `packages`, `intake`, `consent` |
| `routes/counsellor.routes.js` | `providerSelf.routes.js` |
| `routes/communication.routes.js` (messages) | existing `chat.js` + `sessions` (secure chat) |
| `routes/notifications.routes.js` | existing notifications; payments -> existing payments |
| `routes/user.routes.js` | `wellness` (journal), user dashboard aggregate |
| `routes/wellness.routes.js`, `goals.routes.js` | `wellness.routes.js` |
| `routes/treatment.routes.js` | `treatment.routes.js` |
| `routes/peer.routes.js`, `resources.routes.js` | `peer`, `resources` |
| `routes/admin.routes.js`, `analytics.routes.js` | `admin.routes.js` |
| `routes/applications.routes.js` | Join Platform counsellor onboarding + `admin` approvals |
| `routes/upload.routes.js` | existing upload service (protected) |
| `realtime/socket.js` | **delete**, `socketService.js` me rooms |
| `scripts/seed-*.js` | `scripts/mind/seed-mind-demo.mjs` |

---

## 4. Route table (frontend, final)

| Path | Role | Page |
|---|---|---|
| `/mind` | public | Landing |
| `/mind/about`, `/mind/legal` | public | |
| `/find-care/mind` | patient (login se pehle bhi browse) | Find counsellor/psychiatrist |
| `/find-care/mind/:providerId` | public | Provider profile |
| `/book/mind/:providerId` | patient | BookingWizard |
| `/patient/mind` | patient | Mind home (wellness hub) |
| `/patient/mind/sessions` | patient | Meri sessions |
| `/patient/mind/schedule` | patient | Calendar |
| `/patient/mind/packages` | patient | Packages |
| `/patient/mind/wellness`, `/mood`, `/journal`, `/assessments`, `/goals` | patient | Wellness tools |
| `/patient/mind/homework`, `/treatment`, `/safety-plan` | patient | Treatment side |
| `/patient/mind/resources`, `/peer` | patient | Community |
| `/session/:appointmentId` | patient, provider | Session room |
| `/counsellor/dashboard?tab=` | counsellor | Counsellor dashboard |
| `/doctor/dashboard` + `/doctor/mind/*` | doctor (Psychiatry) | Psychiatrist tools |
| `/admin/mind/*` | superadmin | Mind admin |

Purane redirects (App.tsx me):
```
/mind/user            -> /patient/mind
/mind/counselling     -> /find-care/mind?type=counsellor
/mind/psychiatrists   -> /find-care/mind?type=psychiatrist
/mind/psychiatrists/:id -> /find-care/mind/:id
/mind/counselling/:counsellorId -> /find-care/mind/:counsellorId
/mind/session-schedule -> /patient/mind/schedule
/mind/wellness        -> /patient/mind/wellness
/mind/resources       -> /patient/mind/resources
/mind/peer            -> /patient/mind/peer
/mind/counsellor      -> /counsellor/dashboard
/mind/psychiatrist    -> /dashboard   (doctor)
/mind/admin           -> /admin/mind
/mind/dashboard       -> /dashboard
```

---

## 5. Naming conventions

1. Files: components `PascalCase.tsx`, hooks `useThing.ts`, api `camelCase.ts`.
2. Har feature ka data access sirf `features/mind/api/*` se. Component me seedha axios nahi.
3. Ek file 400 line se badi nahi (purani 3000 line wali files ki wajah se hi review mushkil tha).
4. Mongoose model file = ek model.
5. Route file me business logic nahi, service me.
6. Test file source ke saath ya `test/mind/`.
7. i18n keys `mind.*` prefix (jaise `mind.nav.wellness`) `frontend/src/lib/settings.js` me jahan `nav.*` keys hain wahi add hote hain.


# 04 — Database Design + Migration (mindsupport DB -> findmedi DB)

Ek database `findmedi`. Purana `mindsupport` DB sirf migration ke liye read hoga, phir band.

---

## 1. Collection mapping (purana -> naya)

| Mind collection | Naya |
|---|---|
| `users` (role `user`) | FindMedi `users` (role `patient`) |
| `users` (role `counsellor`) | FindMedi `users` (role `counsellor`) + `counsellorprofiles` |
| `users` (role `admin`) | FindMedi `users` (role `superadmin`, ya naya sub-role, admin ke saath decide karo) |
| psychiatrists (pehle se FindMedi `doctors`) | `doctors` + `mentalHealth` sub-doc |
| `appointments` | FindMedi `appointments` (extended) |
| `payments` | FindMedi `payments` (`serviceType: mind_session/mind_package`) |
| `supportpackages` | `supportpackages` |
| `userpackages` | `userpackages` |
| `intakeforms`, `consentforms` | `intakeforms`, `consentforms` |
| appointment.notes (encrypted) | `sessionnotes` (GCM) |
| `moodentries`, `journals`, `wellnessgoals`, `assessments` | `moodentries`, `journalentries`, `wellnessgoals`, `assessments` |
| `assignments`, `prescriptions` | `assignments`; psych prescriptions FindMedi `prescriptions` me (+ `psychrxmeta`) |
| `peerposts`, `peercomments`, `peerreports` | same naam |
| `resources` | `mindresources` |
| `counsellorreports` | `providerreports` |
| `reviews` | FindMedi `reviews` (extended: `providerType`) |
| `messages` | `mindmessages` |
| `notifications` | FindMedi `notifications` (purane migrate nahi, sirf unread wale) |
| `otpverifications` | migrate nahi (expire) |
| `counsellorapplications` | `counsellorprofiles` (status pending) |

---

## 2. Existing models me badlav

### 2.1 `User` (`backend/src/models/User.js`)
role enum me `'counsellor'` jodo:
```js
role: { type: String, enum: [ /* existing... */ , 'counsellor'], ... }
```
Note: `password` field `pre('save')` me **hash hota hai** (`isModified('password')`). Migration me hash copy karte waqt `save()` mat chalao, warna double hash ho jayega aur login fail (section 7).

### 2.2 `Doctor` (psychiatrist ke liye)
```js
mentalHealth: {
  isMentalHealthProvider: { type: Boolean, default: false, index: true },
  providerKind: { type: String, enum: ['psychiatrist', 'clinical_psychologist', 'none'], default: 'none' },
  concerns: [String],            // depression, anxiety, OCD, bipolar, sleep ...
  approaches: [String],          // CBT, medication management, ...
  ageGroups: [String],           // child, adolescent, adult, senior
  prescribesMedication: { type: Boolean, default: true },
  acceptsAnonymous: { type: Boolean, default: false },
  crisisOnCall: { type: Boolean, default: false },
  supportPlanPrices: { oneTime: Number, shortTerm: Number, mediumTerm: Number, longTerm: Number }, // Doctor me pehle se hai, wahi use hoga
},
```
(Doctor me `supportPlanPrices` already hai. Wahi source of truth, duplicate nahi.)

### 2.3 `Appointment`
Naye fields (existing fields nahi hatte, purana code chalta rahe):
```js
serviceLine:   { type: String, enum: ['medical', 'mental_health'], default: 'medical', index: true },
providerType:  { type: String, enum: ['doctor', 'counsellor'], default: 'doctor' },
providerUserId:{ type: ObjectId, ref: 'User', index: true },      // doctor ho ya counsellor, dono ka User id
counsellorProfileId: { type: ObjectId, ref: 'CounsellorProfile', default: null },
startAt:       { type: Date, index: true },                        // UTC, naye engine ka source of truth
endAt:         { type: Date },
durationMin:   { type: Number, default: 50 },
sessionMode:   { type: String, enum: ['video', 'audio', 'chat', 'in_person'], default: 'video' },
isAnonymous:   { type: Boolean, default: false },
anonymousAlias:{ type: String, default: '' },
packageId:     { type: ObjectId, ref: 'UserPackage', default: null },
supportPlanId: { type: String, default: '' },
sessionNumber: { type: Number, default: 1 },                       // package me kaunsa session
concern:       { type: String, default: '' },
crisisFlag:    { type: Boolean, default: false },
meetingProvider:{ type: String, enum: ['inapp', 'google-meet', 'none'], default: 'inapp' },
meetingLink:   { type: String, default: '' },
cancelledBy:   { type: String, enum: ['patient', 'provider', 'system', ''], default: '' },
cancelReason:  { type: String, default: '' },
noShow:        { type: String, enum: ['none', 'patient', 'provider'], default: 'none' },
slotActive:    { type: Boolean, default: false },                  // Pending/Confirmed = true
joinedAt:      { patient: Date, provider: Date },
endedAt:       Date,
```
`status` enum me `'Declined'` aur `'No-Show'` **nahi** jodte (purana code na tute). Mapping: mind `declined` -> `Cancelled` + `cancelledBy:'provider'`; mind `no-show` -> `Missed` + `noShow: 'patient'`.

Naye indexes:
```js
// Provider ka koi bhi active slot do baar book nahi ho sakta:
appointmentSchema.index({ providerUserId: 1, startAt: 1 }, { unique: true, partialFilterExpression: { slotActive: true } });
appointmentSchema.index({ patientId: 1, startAt: -1 });
appointmentSchema.index({ providerUserId: 1, startAt: 1, status: 1 });
appointmentSchema.index({ serviceLine: 1, startAt: -1 });
```
`slotActive` service ya pre-save me set hota hai: `status in [Pending, Confirmed]` to `true`. (Partial index me `$in` par bharosa nahi karte, isliye boolean field.)

Hook (Appointment.js ke end me):
```js
appointmentSchema.pre('save', function (next) {
  this.slotActive = ['Pending', 'Confirmed'].includes(this.status) && !!this.startAt && !!this.providerUserId;
  next();
});
// updateOne / findOneAndUpdate se status badalte waqt slotActive bhi saath set karo:
// Appointment.updateOne({ _id }, { status: 'Cancelled', slotActive: false })
```
Purane doctor appointments me `providerUserId/startAt` nahi hote, isliye unka `slotActive` false rahta hai aur naya unique index unhe nahi chhoota.

`legacy` compatibility: `date` ("YYYY-MM-DD" IST), `time` ("09:00 AM" IST), `doctor` (naam), `patient` (naam), `department` (`Counselling` ya `Psychiatry`) bharte rahenge taaki purani list/screens chalein.

### 2.4 `Payment`
```js
serviceType: { type: String, enum: ['appointment', 'test', 'medicine', 'mind_session', 'mind_package'], default: 'appointment' },
// existing: referenceId, provider, lineItems, refund_amount
```
Extra (mind ke liye): `commissionPct`, `providerShare`, `platformShare`, `payoutStatus` (`pending|paid`), `packageId`.

### 2.5 `Notification`, `Review`
`Notification.type` me `mind_session`, `mind_message`, `mind_homework`, `mind_crisis` jaise types. `Review` me `providerType`, `providerUserId`, `ratings {professionalism, helpfulness, communication}`, `anonymous`.

---

## 3. Naye models (core)

### 3.1 `CounsellorProfile` (LawyerProfile jaisa pattern)
```js
const counsellorProfileSchema = new mongoose.Schema({
  userId: { type: ObjectId, ref: 'User', required: true, unique: true, index: true },
  displayName: String,
  counsellorType: { type: String, enum: ['professional', 'mentor'], default: 'professional' },
  qualifications: [{ degree: String, institute: String, year: Number }],
  licenseNumber: { type: String, index: true },       // RCI / state council etc.
  licenseDocUrl: String, idDocUrl: String, certificateLinks: [String], linkedin: String,
  specializations: [String],                          // anxiety, depression, relationship, career, trauma, addiction...
  approaches: [String],                               // CBT, REBT, mindfulness...
  languages: [String],
  gender: String,
  experienceYears: { type: Number, default: 0 },
  bio: String, profilePhotoUrl: String,
  city: String, clinicName: String, clinicAddress: String, clinicMapLink: String,
  consultationModes: [{ type: String, enum: ['video', 'audio', 'chat', 'in_person'] }],
  sessionPricing: { type: Number, default: 0 },       // single session
  durationMin: { type: Number, default: 50 },
  supportPlanPrices: { oneTime: Number, shortTerm: Number, mediumTerm: Number, longTerm: Number },
  hasCustomSupportPlanPrices: { type: Boolean, default: false },
  customPackages: [{ id: String, name: String, summary: String, sessionCount: Number, duration: String,
                     cadence: String, bestFor: [String], price: Number, theme: String, isActive: { type: Boolean, default: true } }],
  weeklyAvailability: [{ day: { type: Number, min: 0, max: 6 }, start: String, end: String, breaks: [{ start: String, end: String }] }],
  bufferMin: { type: Number, default: 10 },
  minNoticeHours: { type: Number, default: 4 },
  maxAdvanceDays: { type: Number, default: 60 },
  unavailableDates: [String],                         // "YYYY-MM-DD"
  bookingEnabled: { type: Boolean, default: true },
  acceptsAnonymous: { type: Boolean, default: true },
  crisisOnCall: { type: Boolean, default: false },
  privacy: { showOnlineStatus: Boolean, allowMessages: Boolean, anonymousDisplayName: String },
  platformCommissionPct: { type: Number, default: 20 },
  rating: { type: Number, default: 0 }, reviewsCount: { type: Number, default: 0 },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true },
  verificationNote: String, verifiedAt: Date, verifiedBy: { type: ObjectId, ref: 'User' },
  verificationBadge: String,
  payout: { accountName: String, accountNumberEnc: String, ifsc: String, upi: String },
}, { timestamps: true });
counsellorProfileSchema.index({ verificationStatus: 1, bookingEnabled: 1, specializations: 1, languages: 1 });
```

### 3.2 `SupportPackage` (catalog) aur `UserPackage` (purchased)
```js
// SupportPackage: platform ke default plans
{ key: String (unique)  // 'one_time' | 'short_term' | 'medium_term' | 'long_term'
  name, summary, duration, cadence, bestFor:[String], sessionCount, defaultPrice, multiplier, isActive, theme }

// UserPackage: kisi user ka kharida hua bundle
{
  userId, providerType: 'doctor'|'counsellor', providerUserId, planKey, planName,
  sessionsTotal, sessionsUsed: {default 0}, sessionsReserved: {default 0},   // reserved = booked par abhi hui nahi
  minCadenceDays, expiryDate,
  status: 'active'|'completed'|'expired'|'cancelled'|'refunded',
  paymentId, price, currency:'INR',
  mode, modeOptions:[String],
  consentGiven, consentGivenAt, dataEncryptionEnabled: true,
  lastSessionAt,
}
userPackageSchema.index({ userId: 1, status: 1 });
userPackageSchema.index({ providerUserId: 1, status: 1 });
userPackageSchema.index({ status: 1, expiryDate: 1 });
```
`sessionsReserved` naya field hai (mind me nahi tha). Booking par reserve, complete par `used`, cancel par wapas. Isse "ek hi session do baar book" jaisi races band hoti hain (file 06).

### 3.3 `IntakeForm`, `ConsentForm`
```js
IntakeForm: {
  userId, providerUserId, packageId, appointmentId,
  fullName, age, gender, occupation, contactPhone,
  emergencyContact: { name, phone, relation },
  concerns: [String], concernsDetail,
  previousTherapy: String, medicalHistory: String, medications: String,
  sleep, appetite, substanceUse, goals,
  dataEnc: String,      // sensitive free-text fields GCM-encrypted (concernsDetail, medicalHistory, medications)
  submittedAt
}
ConsentForm: {
  userId, providerUserId, packageId,
  kind: 'telehealth'|'data_processing'|'recording_no'|'emergency_contact',
  version: '2026-01', text hash, acceptedAt, ip, userAgent
}
```

### 3.4 `SessionNote` (sirf provider, encrypted)
```js
{
  appointmentId (unique with version), providerUserId, patientUserId,
  version: Number,
  kind: 'soap'|'free'|'risk',
  enc: { keyId: 'v1', iv: String, tag: String, data: String },   // GCM
  riskLevel: 'none'|'low'|'moderate'|'high',
  createdAt
}
sessionNoteSchema.index({ appointmentId: 1, version: -1 });
```
Patient ko note **kabhi nahi dikhta** (jab tak provider "share summary" na kare; `patientSummary` alag plain field: chhota summary jo patient dekh sakta hai).

### 3.5 Wellness models
```js
MoodEntry:    { userId, date (YYYY-MM-DD, unique per user per day), mood 1-5, energy 1-5, sleepHours, anxiety 0-10, tags:[String], noteEnc }
JournalEntry: { userId, title, bodyEnc, mood, tags, sharedWithProviderId (null default), createdAt }
WellnessGoal: { userId, title, category, target, progress, dueDate, status, reminders:[...] }
Assessment:   { userId, kind: 'PHQ9'|'GAD7'|'PSS10'|'WHO5'|'ISI'|'CUSTOM', answers:[Number], score, severity, itemNineFlag: Boolean, takenAt, appointmentId }
```
`Assessment.itemNineFlag`: PHQ-9 ke 9th item (khud ko nuksan ke vichar) me score > 0 ho to `true`. Iska crisis flow file 12 me hai.

### 3.6 Treatment
```js
Assignment:   { appointmentId, providerUserId, patientUserId, title, instructions, type:'reading'|'exercise'|'journal'|'breathing'|'custom',
                resourceId, dueDate, status:'assigned'|'in_progress'|'completed'|'skipped', completedAt, patientNote }
PsychRxMeta:  { prescriptionId (FindMedi Prescription), diagnosisCodes:[String] (ICD-10), followUpInDays, medicationReviewDue, monitoring: [{ test, dueDate }], riskNotes }
TreatmentPlan (ya ChronicCarePlan.condition me mental-health conditions add):
              { patientUserId, providerUserId, goals:[String], interventions:[String], reviewEveryDays, nextReviewAt, status }
```
Psychiatrist ki prescription **FindMedi ke `Prescription`** model me jati hai (taaki Patient ki "My Prescriptions", pharmacy order aur Medicine Reminders sab kaam karein). `PsychRxMeta` sirf extra detail.

### 3.7 Safety
```js
SafetyPlan: { userId, warningSigns:[String], copingStrategies:[String], reasonsToLive:[String], contacts:[{ name, phone, relation }],
              professionalContacts:[...], safeEnvironmentSteps:[String], updatedAt, sharedWithProviderIds:[ObjectId] }
CrisisEvent: { userId, source:'chat'|'assessment'|'journal'|'sos_button'|'provider_flag', severity:'medium'|'high',
               excerptHash, status:'open'|'acknowledged'|'resolved', assignedTo, acknowledgedAt, resolvedAt, notes, createdAt }
```
`excerptHash` me raw text nahi, sirf hash + provider ko dikhane wala minimal snippet (privacy).

### 3.8 Peer, resources, reports
`PeerPost {authorId, alias, body, tags, votes, status:'visible'|'hidden'|'removed', reportCount}`, `PeerComment`, `PeerReport {targetType, targetId, reason, reporterId, status}`, `MindResource {title, type:'article'|'video'|'audio'|'pdf', url, tags, durationMin, createdBy, status}`, `ProviderReport {providerUserId, reporterId, reason, details, status}`.

### 3.9 Slot hold (checkout ke beech me slot pakadna)
```js
SlotHold: { providerUserId, startAt, userId, expiresAt }
slotHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });         // TTL, MongoDB khud delete karega
slotHoldSchema.index({ providerUserId: 1, startAt: 1 }, { unique: true });  // ek slot ek hi hold
```

### 3.10 `MindMessage` (chat history jo migrate hoga)
`{ fromUserId, toUserId, appointmentId, text (encrypted), replyTo, readAt, deletedAt, reactions }`. Naya secure chat isi me likhta hai (file 07).

---

## 4. Retention aur delete policy

| Data | Kab tak | Delete kaun kar sakta hai |
|---|---|---|
| Session notes | Provider ke record policy ke hisaab se (minimum 3 saal suggested, apne legal advisor se confirm karo) | Sirf provider "archive"; hard delete admin + audit |
| Journal, mood | User jab tak chahe | User kabhi bhi |
| Intake, consent | Package/consultation record ke saath | Legal retention ke baad |
| Crisis events | 1 saal | Admin |
| Chat | 1 saal | User apne side se hide |
| Anonymous alias mapping | Provider ke liye alias, admin ke liye asli identity (audit ke saath) | |

"Delete my account" flow: mental-health data ko pehle export offer karo, phir anonymize (sirf legally required records bache). DPDP Act (India) aur apni privacy policy ke saath align karna, legal advisor se ek baar confirm zaroor karo.

---

## 5. Encryption (field level)

- Algorithm: **AES-256-GCM**, 12-byte IV, auth tag save.
- Key: env `MIND_NOTES_KEY_<id>` (32 bytes hex), `MIND_NOTES_KEY_CURRENT=v1`. Data me `keyId` store, rotation par naye records naye key se, purane purane key se.
- Kabhi fallback key nahi. Key missing = server start fail.
- Code: file 14 (`crypto.js`).

---

## 6. Migration plan

### 6.1 Pehle
1. Dono databases ka **backup** (`mongodump`).
2. Staging pe dry-run.
3. Freeze window: mind server band (ya read-only).
4. `MINDSUPPORT_URI` aur `MONGO_URI` env ready.

### 6.2 Order (script isi order me chalata hai)
1. Users: mind `role:user` -> FindMedi `patient`, `counsellor` -> `counsellor`. Email match par existing FindMedi user reuse.
2. CounsellorProfile (mind user ke counsellor fields se).
3. Packages: `supportpackages`, `userpackages` (user/counsellor ids `MindLegacyIdMap` se).
4. Payments.
5. Appointments (mapping table section 2.3) + `slotActive`.
6. Session notes (decrypt CBC -> encrypt GCM).
7. Intake, consent.
8. Mood, journal, goals, assessments.
9. Assignments, psychiatrist prescriptions (agar mind me the).
10. Messages.
11. Peer, resources, reports.
12. Reviews.
13. Unread notifications only.

### 6.3 ID mapping
```js
MindLegacyIdMap: { collection: 'users'|'appointments'|..., oldId: String, newId: ObjectId, migratedAt }
index: { collection: 1, oldId: 1 } unique
```
Script **idempotent** hai: dobara chalao to already-migrated skip.

### 6.4 Script skeleton (`backend/scripts/mind/migrate-from-mindsupport.mjs`)
```js
import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import User from '../../src/models/User.js';
import Appointment from '../../src/models/Appointment.js';
import CounsellorProfile from '../../src/models/mind/CounsellorProfile.js';
import MindLegacyIdMap from '../../src/models/mind/MindLegacyIdMap.js';
import { encryptField } from '../../src/modules/mind/lib/crypto.js';
import { generate16DigitId } from '../../src/utils/idGenerator.js';

const DRY = process.argv.includes('--dry');
const legacy = await mongoose.createConnection(process.env.MINDSUPPORT_URI, { dbName: 'mindsupport' }).asPromise();
await mongoose.connect(process.env.MONGO_URI);
const L = (name) => legacy.collection(name);

const stats = {};
const bump = (k) => (stats[k] = (stats[k] || 0) + 1);

async function mapId(collection, oldId) {
  const r = await MindLegacyIdMap.findOne({ collection, oldId: String(oldId) }).lean();
  return r?.newId || null;
}
async function saveMap(collection, oldId, newId) {
  if (DRY) return;
  await MindLegacyIdMap.updateOne({ collection, oldId: String(oldId) }, { $set: { newId, migratedAt: new Date() } }, { upsert: true });
}

// ---- 1) Users ----
for await (const u of L('users').find({})) {
  if (await mapId('users', u._id)) { bump('users_skipped'); continue; }
  const role = u.role === 'counsellor' ? 'counsellor' : u.role === 'admin' ? 'superadmin' : 'patient';
  let target = await User.findOne({ email: u.email });
  if (!target) {
    const doc = {
      name: u.name, email: u.email,
      password: u.passwordHash,                 // bcrypt hash as-is (raw insert => pre('save') nahi chalega)
      role, phone: u.phone || '0000000000',     // required field; user se baad me profile complete karwao
      isVerified: !!u.otpVerified, status: u.status === 'suspended' ? 'blocked' : 'active',
      approvalStatus: role === 'counsellor' ? (u.verificationStatus === 'approved' ? 'approved' : 'pending') : 'not_required',
      uhid: generate16DigitId(),
      createdAt: u.createdAt, updatedAt: u.updatedAt,
    };
    if (!DRY) { const r = await User.collection.insertOne(doc); target = { _id: r.insertedId }; }
    bump('users_created');
  } else { bump('users_matched_by_email'); }
  if (target?._id) await saveMap('users', u._id, target._id);
}
// ---- 2) CounsellorProfile ---- (u.role === 'counsellor' se fields copy: specialization -> specializations, pricing, availability ...)
// ---- 3..13) same pattern ----

// Notes re-encryption
function decryptCbcLegacy(text, legacyKey) {
  const [ivHex, ...rest] = String(text).split(':');
  const d = crypto.createDecipheriv('aes-256-cbc', legacyKey, Buffer.from(ivHex, 'hex'));
  return Buffer.concat([d.update(Buffer.from(rest.join(':'), 'hex')), d.final()]).toString('utf8');
}
const legacyKey = crypto.createHash('sha256')
  .update(process.env.LEGACY_NOTES_KEY || process.env.JWT_SECRET || 'mindsupport-fallback-key-2024').digest();
for await (const a of L('appointments').find({ notesEncrypted: true, notes: { $ne: '' } })) {
  let plain; try { plain = decryptCbcLegacy(a.notes, legacyKey); } catch { bump('notes_failed'); continue; }
  const enc = encryptField(plain);                 // GCM
  // SessionNote.create({ appointmentId: newApptId, providerUserId, patientUserId, version: 1, enc, ... })
  bump('notes_reencrypted');
}
console.log(DRY ? 'DRY RUN' : 'DONE', stats);
await mongoose.disconnect(); await legacy.close();
```
Run:
```
node backend/scripts/mind/migrate-from-mindsupport.mjs --dry     # pehle
node backend/scripts/mind/migrate-from-mindsupport.mjs           # phir asli
node backend/scripts/mind/verify-migration.mjs
```

### 6.5 Appointment mapping (code)
```js
const modeMap = { 'in-person': 'in_person', online: 'video', 'google-meet': 'video', 'voice-call': 'audio', 'chat-only': 'chat', 'video-chat': 'video' };
const statusMap = { pending: 'Pending', confirmed: 'Confirmed', declined: 'Cancelled', cancelled: 'Cancelled', completed: 'Completed', 'no-show': 'Missed' };
const startAt = istToUtc(a.date, a.time);              // date "YYYY-MM-DD" + time "HH:mm" (IST) -> UTC
{
  serviceLine: 'mental_health', providerType: 'counsellor', providerUserId: counsellorNewId,
  patientId: studentNewId, patient: studentName, doctor: a.counsellorName, department: 'Counselling',
  date: a.date, time: to12h(a.time), startAt, endAt: addMin(startAt, 50), durationMin: 50,
  appointmentMode: modeMap[a.mode] === 'in_person' ? 'offline' : modeMap[a.mode],
  sessionMode: modeMap[a.mode], status: statusMap[a.status],
  cancelledBy: a.status === 'declined' ? 'provider' : (a.status === 'cancelled' ? 'patient' : ''),
  noShow: a.status === 'no-show' ? 'patient' : 'none',
  isAnonymous: a.isAnonymous, anonymousAlias: a.anonymousAlias, concern: a.concern, crisisFlag: a.crisisFlag,
  packageId: pkgNewId, slotActive: ['pending', 'confirmed'].includes(a.status),
  meetingProvider: a.meetingLink ? 'google-meet' : 'inapp', meetingLink: a.meetingLink,
  fees: a.supportPlanPrice || 0, type: 'Video Consultation',
}
```
`tokenNumber` (unique sparse) khali chhodo. `date+time` purana doctor-unique index (`doctorId, patientId, date, time`) counsellor rows me `doctorId` null hone se collide nahi karega.

---

## 7. Password aur login (sabse zaroori detail)

- Mind `passwordHash` bcrypt hai. FindMedi bhi bcrypt (`bcryptjs`, cost 10). Compatible.
- FindMedi `User` pre-save `password` ko dobara hash karta hai jab `isModified('password')`. Isliye migration me `User.collection.insertOne(...)` (raw) use kiya, jo mongoose hooks aur validation bypass karta hai. Fir `phone` placeholder aur `uhid` khud set kiya.
- Test: migration ke baad ek known mind user se FindMedi login page pe login karke dekho (verify script me ek automatic check hai).
- Jinhone mind me Google se sign-in kiya tha (password nahi), unka `passwordHash` random hoga. Unhe "Forgot password" ya Google login se aana padega. Ye announce karo.

## 8. Verification script (`verify-migration.mjs`) kya check kare

| Check | Pass condition |
|---|---|
| Counts | `mind.users == mapped users` (matched + created), same for appointments, packages, journals |
| Orphans | Har appointment ka patient aur provider exist |
| Package math | `sessionsUsed <= sessionsTotal` |
| Notes | Random 20 notes decrypt (GCM) sahi text |
| Login | 3 sample users bcrypt compare pass |
| Slots | Koi duplicate `(providerUserId, startAt)` with `slotActive:true` nahi |
| Money | `sum(payments)` purane aur naye equal |

## 9. Rollback

1. Migration se pehle ka `mongodump` restore.
2. `MindLegacyIdMap` se pata chalta hai kya migrate hua, uske hisaab se selective delete bhi ho sakta hai (`newId` list).
3. Purana mindsupport DB delete mat karo jab tak 30 din stable na ho.

## 10. Seed (naya)

`seed-mind-demo.mjs`: 3 counsellors, 2 psychiatrists (`seed-psychiatrists.mjs` reuse), 1 patient, packages, resources. **Random generated passwords** print karo, hard-coded (`Counsellor@123`) nahi. Production me seed script blocked (`NODE_ENV` check).


# 05 — Auth, Roles, Permissions, Privacy

Mental-health data medical data se bhi zyada sensitive hai. Isliye is file ke rules baaki sab features se pehle lagne chahiye.

---

## 1. Identity model

Ek insaan = ek `User` (FindMedi). Uske paas ek `role` hota hai.

| Role | Kaun | Mind me kya karta hai |
|---|---|---|
| `patient` | Normal user | Book, wellness tools, sessions, packages |
| `counsellor` (naya) | Counsellor / therapist / mentor | Sessions, clients, notes, homework, packages, earnings |
| `doctor` + `Doctor.mentalHealth.isMentalHealthProvider = true` | Psychiatrist | Sessions, prescriptions, medication review, assessments, treatment plan |
| `superadmin` | Platform admin | Provider verification, moderation, payouts, crisis monitor |

Psychiatrist ke liye naya role nahi. Provider check hamesha `requireProvider` middleware se hota hai jo `counsellor` ya `doctor(mentalHealth)` dono ko pehchanta hai.

---

## 2. Signup / onboarding flows

### 2.1 Patient
1. Normal FindMedi signup. Mind ke liye alag account nahi.
2. Pehli baar Mind & Wellness kholne par ek welcome screen: kya milega, privacy points, "Continue".
3. Consent (telehealth + data processing) booking ke waqt, file 06.

### 2.2 Counsellor (Lawyer onboarding jaisa)
1. `Join Platform` page par naya card: "Counsellor / Therapist".
2. Form steps:
   - Personal: naam, email, phone, gender, city, languages, photo
   - Professional: type (professional/mentor), qualifications, experience, licence number + document (RCI/state council/degree), ID document, specialisations, approaches
   - Practice: consultation modes, session price, packages, weekly availability, buffer, notice
   - Payout: UPI/bank (encrypted)
   - Agreements: code of conduct, confidentiality, crisis protocol, commission
3. Submit -> `User(role:'counsellor', approvalStatus:'pending')` + `CounsellorProfile(verificationStatus:'pending')`.
4. Login ho sakta hai. Dashboard sirf "Verification pending" screen aur profile edit dikhata hai. Discovery me nahi dikhta.
5. Admin approve karta hai (file 11) -> `approvalStatus:'approved'`, `verificationStatus:'approved'`, badge, notification.
6. Reject ho to reason ke saath, dobara submit ka option.

### 2.3 Psychiatrist
1. Existing doctor onboarding (hospital/clinic ke through).
2. Admin `mentalHealth` tab me: NMC registration + MD Psychiatry verify, `isMentalHealthProvider = true`, `providerKind = 'psychiatrist'`.
3. Doctor ko "Mental health provider" ka naya section apne dashboard me dikhta hai (file 10).
4. Uske baad wo Mind discovery me "Psychiatrists" tab me aata hai.

---

## 3. Authentication

- Existing `protect` (`backend/src/middleware/auth.js`): cookie `token` ya `Authorization: Bearer`.
- Mind router ke upar ek jagah `router.use(protect)` (file 02). Koi mind route bina `protect` ke nahi.
- Sirf discovery (`/api/public/mind/*`) public, aur wo bhi sanitized fields.
- Password reset, email OTP: existing flows. Mind ka alag OTP nahi.
- 2FA: FindMedi `User` me `twoFactorEnabled` hai. **Providers (counsellor, psychiatrist) aur admin ke liye 2FA mandatory** rakhna suggested hai (patient ke saath sensitive data jo hai).

### 3.1 Socket authentication (P0, merge se pehle)
**Repo me abhi:** FindMedi ka `socketService.js` `join` event me client ka bheja hua `userId` maan leta hai:
```js
socket.on('join', async (payload) => {
  const userId = typeof payload === 'object' ? payload?.userId : payload;
  ...
  socket.join(`user:${userId}`);
```
Koi bhi kisi ka `userId` bhej ke uske `user:{id}` room me aa sakta hai aur uski notifications sun sakta hai. Mind events (crisis alert, session status) isi room me jayenge, isliye ye pehle fix hona chahiye.

**Fix:** handshake par token verify, `userId` server decide kare.
```js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

io.use(async (socket, next) => {
  try {
    const raw = socket.handshake.auth?.token
      || (socket.handshake.headers.cookie || '').match(/(?:^|;\s*)token=([^;]+)/)?.[1];
    if (!raw) return next(new Error('unauthorized'));
    const payload = jwt.verify(raw, process.env.JWT_SECRET);
    const user = await User.findById(payload.id || payload._id).select('_id role status');
    if (!user || user.status === 'blocked') return next(new Error('unauthorized'));
    socket.userId = String(user._id);
    socket.userRole = user.role;
    next();
  } catch { next(new Error('unauthorized')); }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);          // auto-join, client se nahi
  socket.on('join', () => {});                    // purana client compatibility: ignore payload
```
Frontend: `io(url, { auth: { token } })`. Token ka payload field naam (`id` ya `userId`) apne `protect` jaisa rakho.

Session room:
```js
socket.on('mind:join_session', async ({ appointmentId }, ack) => {
  const appt = await Appointment.findById(appointmentId).select('patientId providerUserId status startAt endAt');
  const ok = appt && [String(appt.patientId), String(appt.providerUserId)].includes(socket.userId);
  if (!ok) return ack?.({ ok: false });
  socket.join(`appointment:${appointmentId}`);
  ack?.({ ok: true });
});
```

---

## 4. Permission matrix

`own` = apna data. `client` = jiske saath active relationship hai (appointment ya package, status Pending/Confirmed/Completed, cancelled nahi). `-` = koi access nahi.

| Resource | patient | counsellor | psychiatrist | superadmin |
|---|---|---|---|---|
| Provider public profile | read | read (apna edit) | read (apna edit) | read/verify |
| Availability slots | read | own edit | own edit | read |
| Booking (appointment) | create/read/cancel own | read/confirm/decline/complete client | same | read (metadata) |
| Package | buy/read own, refund request | read client | read client | read/refund |
| Intake form | create/read own | read client | read client | - |
| Consent form | create/read own | read client | read client | audit only |
| Session note | **-** | own write/read | own write/read | - (break-glass only) |
| Patient summary (shared) | read own | write for client | write for client | - |
| Mood entries | own | client (patient ne share on kiya ho to) | same | - |
| Journal | own | **sirf jo entry patient ne share ki** | same | - |
| Assessments | own | client | client | aggregate only |
| Homework | read/complete own | create/read client | same | - |
| Prescription (psych) | read own | **-** (counsellor prescribe nahi kar sakta) | create/read client | - |
| Safety plan | own edit | read client (patient ne share on kiya ho) | same | - |
| Crisis events | own trigger | assigned | assigned | read/assign/resolve |
| Chat (session) | own | client | client | - |
| Peer posts | create/read | read/moderate (badge) | read | moderate |
| Provider earnings | - | own | own (existing doctor earnings) | all |
| Analytics | - | own summary | own summary | platform (aggregate) |

Rules:
1. Default deny. Har route ek explicit policy function se guzarta hai.
2. Provider ko **relationship** ke bina koi patient data nahi dikhta (sirf role kaafi nahi).
3. Admin ko therapy note, journal, chat kabhi nahi dikhte. Admin ko sirf metadata (kaun, kab, status, amount) dikhta hai.
4. "Break-glass": sirf crisis me (section 7).

---

## 5. Policy code (`modules/mind/policies/access.js`)

```js
import Appointment from '../../../models/Appointment.js';
import UserPackage from '../../../models/mind/UserPackage.js';

export const isProviderUser = (user) =>
  user.role === 'counsellor' || (user.role === 'doctor' && user.mentalHealth?.isMentalHealthProvider);

// active relationship: kya ye provider is patient ka client-provider hai?
export async function hasRelationship(providerUserId, patientUserId) {
  const [appt, pkg] = await Promise.all([
    Appointment.exists({
      providerUserId, patientId: patientUserId, serviceLine: 'mental_health',
      status: { $in: ['Pending', 'Confirmed', 'Completed'] },
    }),
    UserPackage.exists({ providerUserId, userId: patientUserId, status: { $in: ['active', 'completed'] } }),
  ]);
  return !!(appt || pkg);
}

export async function canViewClientData(actor, patientUserId) {
  if (String(actor._id) === String(patientUserId)) return true;
  if (!isProviderUser(actor)) return false;
  return hasRelationship(actor._id, patientUserId);
}

export const canWriteNote = async (actor, appointment) =>
  isProviderUser(actor) && String(appointment.providerUserId) === String(actor._id);

export const canReadNote = canWriteNote;                       // patient ko note nahi
export const canReadJournal = (actor, entry) =>
  String(entry.userId) === String(actor._id) ||
  (entry.sharedWithProviderId && String(entry.sharedWithProviderId) === String(actor._id));
export const canPrescribe = (actor) => actor.role === 'doctor' && actor.mentalHealth?.providerKind === 'psychiatrist';
```

Middlewares:
```js
// middleware/requireProvider.js
export const requireProvider = (req, res, next) =>
  isProviderUser(req.user) ? next() : res.status(403).json({ success: false, code: 'PROVIDER_ONLY', message: 'Sirf providers ke liye' });

// middleware/requireConsent.js  (booking se pehle)
export const requireConsent = (kind = 'telehealth') => async (req, res, next) => {
  const ok = await ConsentForm.exists({ userId: req.user._id, kind, version: CURRENT_CONSENT_VERSION });
  return ok ? next() : res.status(409).json({ success: false, code: 'CONSENT_REQUIRED', kind });
};
```

Route me use (example):
```js
router.get('/sessions/:id/notes', requireProvider, async (req, res) => {
  const appt = await Appointment.findById(req.params.id);
  if (!appt || !(await canReadNote(req.user, appt))) return res.status(404).json({ success: false }); // 404, 403 nahi (existence chhupao)
  ...
});
```
Note: unauthorized par 404 do, taaki id enumeration se pata na chale ki record hai.

---

## 6. Anonymous mode

- Patient booking me "Anonymous rakhein" chuna to provider ko asli naam, email, phone **nahi** dikhta. Sirf alias (jaise "Calm Otter 42").
- Provider dashboard me sab jagah alias. `normalizeAppointment(viewer)` jaisa serializer: role provider aur `isAnonymous` ho to naam/email hata do.
- Kya nahi chhupta: payment (admin ke liye), crisis break-glass (section 7).
- Video call me patient camera off/naam alias rakh sakta hai.
- Kuch providers `acceptsAnonymous:false` rakh sakte hain, discovery me filter.

---

## 7. Break-glass (crisis me pehchan kholna)

1. Provider ya admin "Reveal identity for safety" dabata hai.
2. Reason mandatory + 2nd confirmation.
3. `AuditLog` (who, whom, reason, timestamp), aur patient ko notification: "Aapki safety ke liye aapki pehchan share ki gayi."
4. Sirf `CrisisEvent.status = open` ke doran, 24 ghante ka access.
5. Admin ko monthly break-glass report.

---

## 8. Cross-domain sharing (FindMedi medical <-> Mind)

Patient ke Settings me alag toggles (default **OFF**):
1. "Mere primary doctor ko meri mental-health summary dikhao"
2. "Mere counsellor/psychiatrist ko meri medical history (vitals, medicines, reports) dikhao" (per provider, revoke kabhi bhi)
3. "Mere counsellor ko meri mood/journal shared insights dikhao" (per entry share bhi possible)

Default me: FindMedi ka koi normal doctor **mind notes/journal nahi dekhta**. Psychiatrist ki prescriptions normal FindMedi prescriptions hain (pharmacy ke liye zaroori), lekin diagnosis field patient-consent ke saath hi doosre doctors ko dikhti hai.

---

## 9. Discreet mode aur quick exit

Kai users ghar me safe nahi hote. Product level features:
1. **Discreet notifications**: push/email me "Session" ya "Therapy" shabd nahi, generic "FindMedi: aapka appointment reminder". Settings me toggle.
2. **Quick exit** button (mind pages ke header me): ek click me `window.location.replace('https://www.google.com')` aur history replace.
3. **App lock** (optional): mind section kholte waqt PIN/biometric (browser me WebAuthn later).
4. **Email/SMS** me kabhi sensitive details nahi.
5. Billing statement me service name generic "Wellness consultation".

---

## 10. Rate limiting, validation, uploads

| Area | Limit |
|---|---|
| Login (existing) | as is |
| Booking create | 10 / 10 min / user |
| Slot hold | 20 / 10 min / user |
| Peer post / comment | 5 / 10 min / user |
| Chat message | 60 / min / user |
| Assessment submit | 10 / hour |
| Crisis endpoint | limit **nahi** (kabhi rok mat, sirf abuse ke liye soft alert) |

- Sab bodies zod se validate. Unknown fields **strip** (mass assignment se bachne ke liye `schema.strict()`).
- `role`, `status`, `verificationStatus`, `platformCommissionPct` kabhi request body se nahi.
- Uploads: `/api/mind/upload` protect ke peeche; type (image/pdf), size (5MB), per-user folder, virus-scan hook (optional). Cloudinary signature sirf login user ko, aur folder `mind/{userId}` force.
- Peer posts, journal, notes: server side sanitize (`sanitize-html`), XSS se bachne ke liye. Markdown allow karo to whitelist.

---

## 11. Audit log

`AuditLog` me ye actions:
`mind.note.read`, `mind.note.write`, `mind.intake.read`, `mind.journal.read_shared`, `mind.assessment.read`, `mind.rx.create`, `mind.identity.reveal`, `mind.crisis.ack/resolve`, `mind.package.refund`, `mind.provider.verify`, `mind.export`.
Fields: actorId, actorRole, patientId, resourceId, action, ip, userAgent, time. Text kabhi log nahi.
Retention 2 saal. Admin me search screen.

---

## 12. Threat table

| Threat | Mitigation |
|---|---|
| IDOR (`/appointments/:id`) | Har fetch policy se + 404 on deny |
| Role escalation (body me `role:'superadmin'`) | Body whitelist |
| Socket room hijack | Handshake token auth (3.1) |
| Stored XSS (peer post, journal) | Server sanitize + CSP |
| Enumeration of users | Generic errors, rate limit |
| Slot sniping / double booking | Unique index + hold (file 06) |
| Payment replay | Idempotency key + status check |
| Data exfiltration by provider | Relationship check, audit, export limit |
| Insider (admin) snooping | Admin ko content nahi, break-glass audit |
| Leaked key | Key versioning + rotate script |
| Cloudinary abuse | Authenticated signed upload, folder + size limits |

---

## 13. Permission tests (jest + supertest)

`backend/test/mind/permissions.test.js`: har route ke liye ye 5 login states try karo:
1. anonymous
2. patient A (owner)
3. patient B (dusra)
4. provider with relationship
5. provider without relationship
6. superadmin

Expected table (example):

| Route | anon | patient A | patient B | provider(rel) | provider(no rel) | admin |
|---|---|---|---|---|---|---|
| `GET /api/mind/sessions/:id/notes` | 401 | 404 | 404 | 200 | 404 | 404 |
| `GET /api/mind/wellness/journal` | 401 | 200 (own) | 200 (own list only) | 200 (shared only) | 200 (empty) | 403 |
| `PATCH /api/mind/admin/providers/:id` | 401 | 403 | 403 | 403 | 403 | 200 |

Ye tests CI me gate hain: fail = merge nahi.


# 06 — Booking: Discovery se Payment tak (Counsellor + Psychiatrist)

Ek hi booking engine dono ke liye. Farak sirf service type, duration aur extra steps me hai. Flow text me hai, koi diagram nahi.

---

## 1. Booking kahan se shuru hoti hai (entry points)

| Entry | Jahan se | Prefilled kya |
|---|---|---|
| Discovery | `/find-care/mind` | kuch nahi |
| Provider profile CTA | `/find-care/mind/:providerId` | provider |
| Follow-up | Session complete screen / "My Sessions" | same provider, same mode, agla suitable din |
| Package se | "My Packages" -> "Use a session" | provider, package |
| Assessment result | PHQ-9/GAD-7 result -> "Talk to someone" | recommended providers, concern |
| Prescription follow-up | Psychiatrist ne "review in 14 days" likha | same psychiatrist |
| Dashboard widget | Mind Home "Book your next session" | last provider |
| Crisis | Alag flow (file 12), booking nahi | |

---

## 2. Discovery

### 2.1 Page: `/find-care/mind`
1. Upar tabs: **Counsellors | Psychiatrists | All**. URL `?type=counsellor|psychiatrist`.
2. Search box (naam, concern, city).
3. Filters (drawer on mobile):
   - Concern: anxiety, depression, stress, relationship, career, grief, trauma, OCD, sleep, addiction, ADHD, other
   - Mode: video, audio, chat, in-person
   - Language
   - Price range (per session)
   - Gender preference
   - Availability: "aaj", "is hafte", "koi bhi"
   - Rating 4+
   - Type: professional / mentor (sirf counsellor)
   - Anonymous friendly
   - City (in-person ke liye)
4. Sort: Best match, Earliest available, Price low to high, Rating, Experience.
5. Optional **"Help me choose"** 4-question quiz: kya chal raha hai (concern), kab se, pehle therapy/medication li hai?, preference (baat karna / medication). Result: ranked list + suggestion "Counsellor se shuru karein" ya "Psychiatrist se milna behtar".
6. Card (`ProviderCard`): photo, naam, badge (Verified, Psychiatrist/Counsellor/Mentor), qualification line, languages, experience, rating (count), concerns chips (3), modes icons, "Next available: Aaj 6:30 PM", price "Rs 800 / session", "Book" aur "View profile".

### 2.2 API
```
GET /api/public/mind/providers?type=&concern=&mode=&language=&minPrice=&maxPrice=&gender=&city=&availability=&rating=&anonymous=&q=&sort=&page=&limit=
```
Response item (sirf safe fields, koi PHI nahi):
```json
{
  "id": "…", "kind": "counsellor", "userId": "…",
  "name": "Dr. Aisha Mehra", "photo": "…", "badge": "verified",
  "title": "Clinical Psychologist", "experienceYears": 8,
  "languages": ["Hindi", "English"], "concerns": ["anxiety", "depression"],
  "modes": ["video", "audio", "chat"], "rating": 4.8, "reviewsCount": 132,
  "price": { "single": 800, "currency": "INR" },
  "nextSlotAt": "2026-09-22T13:00:00.000Z",
  "acceptsAnonymous": true, "matchScore": 86
}
```
`kind: 'psychiatrist'` ke liye source `Doctor` (`mentalHealth.isMentalHealthProvider = true`, `approved`), counsellor ke liye `CounsellorProfile` (`verificationStatus:'approved'`, `bookingEnabled:true`). Ek service dono ko merge karke return karti hai (`providerDirectory.js`).

### 2.3 Ranking (matchScore)
```
score = 40 * concernMatch(0..1)
      + 20 * availabilitySoon (aaj=1, 3 din me=0.6, 7 din me=0.3)
      + 15 * ratingNorm (rating/5)
      + 10 * languageMatch
      + 10 * priceFit (user ka range ke andar)
      +  5 * modeMatch
```
Jinka `bookingEnabled=false` ya verification pending, wo nahi dikhte. Sponsored/paid ranking nahi (mental health me bharosa zaroori hai).

---

## 3. Provider profile (`/find-care/mind/:providerId`)

Sections upar se neeche:
1. Header: photo, naam, badges, rating, "Book session" (sticky on mobile).
2. About + approach (kaise kaam karte hain), concerns, languages, experience.
3. Credentials: qualifications, licence/registration number (masked partially), verification date.
4. Services & pricing: single session, packages (one-time / short / medium / long term, custom packages), duration, modes.
5. Availability preview: agle 7 din ke slots (chips), "Sab slots dekhein".
6. Reviews: rating breakdown (professionalism, helpfulness, communication), anonymous reviews, "helpful" votes.
7. FAQs: kya expect karein, cancellation policy, privacy, anonymous booking.
8. Safety note: "Ye emergency service nahi hai" + helplines.
9. Similar providers.

Psychiatrist profile extra: medication management, first consultation vs follow-up fees, "Prescribes medication", NMC registration.

---

## 4. Booking wizard (`/book/mind/:providerId`)

Ek page, 7 steps, upar progress bar, neeche sticky summary. Har step ka data `useBookingMachine` (local state + sessionStorage) me. Back button state nahi khota.

### Step 1: Choose service
- Counsellor:
  - **Single session** (price, duration)
  - **Packages**: One-time / Short term / Medium term / Long term ya custom (sessionCount, cadence, expiry, "Best for" tags, per-session saving %).
- Psychiatrist:
  - **First consultation** (45 se 60 min)
  - **Follow-up** (20 se 30 min)
  - **Medication review**
  - Package (agar psychiatrist ne banaya)
- Mode select: video / audio / chat / in-person (provider jo support kare wahi).
- Concern (optional dropdown + short text, 300 char). "Ye dusre ke liye hai?" nahi (mental health me self only; bachchon ke liye guardian flow phase 2).
- Existing active package hai to top par banner: "Aapke paas 3 sessions bache hain (Short term plan). Use karein?" (Use karein = payment skip).

### Step 2: Choose slot
- Date strip (agle `maxAdvanceDays`), disabled dates grey.
- Time chips (IST me, timezone label), "Morning / Afternoon / Evening" groups.
- Slot select karte hi `POST /availability/hold`: slot 5 minute ke liye pakda jata hai, header me countdown "04:32".
- Slot gayab ho gaya to toast + refresh, doosra slot chuno.
- Package me: `minCadenceDays` ke hisaab se jo dates allowed nahi wo disabled ("Agla session 7 din baad").
- Agar koi slot nahi: "Notify me" (waitlist) button.

### Step 3: Quick check-in (optional)
- 2 questions (PHQ-2) ya PHQ-9/GAD-7 choose, "Skip" allowed.
- Result provider ko diya jaye (patient ki sahmati ke saath). Score dikhana optional.
- Item-9 ya high risk answer hone par turant Safety sheet (file 12) khulti hai, booking nahi rukti.

### Step 4: Intake (sirf is provider ke saath pehli baar)
- Basic: naam (alias agar anonymous), age, gender, occupation, contact.
- Concerns (chips) + description, previous therapy, medications, medical history, goals, sleep/appetite.
- Emergency contact (naam, phone, relation), **zaroori** (crisis me kaam aata hai).
- Psychiatrist ke liye extra: current medications with dose, allergies, past psychiatric diagnosis, substance use, family history, prior records upload (optional).
- Prefill: profile + purani intake se. Auto-save draft.
- Agar pehle hi is provider ko intake de chuka hai: step skip, "Intake already on file, update karein?".

### Step 5: Consent
1. Telehealth consent (kya hai, limits, emergency ke liye nahi).
2. Data processing consent (kya store hota hai, kaun dekh sakta hai, encryption).
3. Recording: "Sessions record nahi hote."
4. Anonymous toggle (agar provider allow kare).
5. Sharing toggles (default OFF): medical history counsellor ko, summary primary doctor ko.
6. Checkbox + "I agree", version aur time save (`ConsentForm`).

### Step 6: Review
- Provider, service, date-time, mode, duration.
- Price breakdown: session fee, platform fee/GST (config), discount, total. Package me per-session cost.
- Cancellation policy ka chhota table (section 10).
- Coupon/rewards (FindMedi rewards system se) optional.
- "Confirm and pay".

### Step 7: Payment
- Existing methods (card, UPI, netbanking, wallet), `Payment` model.
- `Idempotency-Key` header.
- Success -> booking created (`Pending` ya `Confirmed`), fail -> slot hold abhi bhi 5 minute tak (retry).
- Package purchase: pehle package + payment, phir uske sessions me se pehla slot book.

### Done screen
- Status: **Confirmed** (auto-confirm) ya **Awaiting provider** (12 ghante me confirm; nahi to auto-refund).
- Add to calendar (.ics), "Join instructions" (mode ke hisaab se), preparation tips (shaant jagah, earphones, notes).
- "Set reminder" default ON (24h, 1h, 10 min).
- Buttons: "View session", "Book another", "Go to Mind Home".

Total clicks user ke liye: slot chunna -> (optional check-in) -> intake (pehli baar) -> consent -> pay. Repeat booking me intake aur consent skip hote hain, isliye 3 click.

---

## 5. Slot engine

### 5.1 Provider ki schedule ko ek shape me laana
Counsellor: `CounsellorProfile.weeklyAvailability` (`day` 0=Sun..6, `start`, `end`, `breaks`), `bufferMin`, `minNoticeHours`, `maxAdvanceDays`, `unavailableDates`.
Psychiatrist (`Doctor`): `workingHours {start,end}`, `weekly_schedule {monday:true,...}`, `slotDuration`, `breakTime {start,end}`, `leaves [dates]`, `dateDisabledSlots`, `bookingWindow`, `autoConfirmAppointment`.

Adapter (`slotEngine.js`):
```js
const DAY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

export function normalizeSchedule(provider) {
  if (provider.kind === 'counsellor') {
    const p = provider.profile;
    return {
      windowsFor: (dow) => p.weeklyAvailability.filter(w => w.day === dow)
                            .map(w => ({ start: w.start, end: w.end, breaks: w.breaks || [] })),
      bufferMin: p.bufferMin ?? 10, minNoticeHours: p.minNoticeHours ?? 4, maxAdvanceDays: p.maxAdvanceDays ?? 60,
      offDates: new Set(p.unavailableDates || []), disabledByDate: {}, autoConfirm: p.autoConfirm ?? true,
    };
  }
  const d = provider.doctor;
  const bw = d.bookingWindow || { unit: 'weeks', value: 2 };
  const days = { hours: bw.value / 24, days: bw.value, weeks: bw.value * 7, months: bw.value * 30 }[bw.unit];
  return {
    windowsFor: (dow) => d.weekly_schedule?.[DAY[dow]]
      ? [{ start: d.workingHours?.start || '09:00', end: d.workingHours?.end || '17:00',
           breaks: d.breakTime?.start ? [{ start: d.breakTime.start, end: d.breakTime.end }] : [] }] : [],
    bufferMin: d.mentalHealth?.bufferMin ?? 10,      // Doctor.bufferPerHour ka matlab alag hai, isliye naya field
    minNoticeHours: 2, maxAdvanceDays: Math.max(1, Math.ceil(days)),
    offDates: new Set(d.leaves || []), disabledByDate: d.dateDisabledSlots || {},
    autoConfirm: d.autoConfirmAppointment ?? true,
  };
}
```
(`bufferPerHour` ka matlab doctor model me alag hai, isliye psychiatrist ke liye `mentalHealth.bufferMin` naya field rakho, default 10.)

### 5.2 Slot generation
```js
const IST = '+05:30';                                  // India me DST nahi
export const istToUtc = (dateStr, hhmm) => new Date(`${dateStr}T${hhmm}:00${IST}`);
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export async function getSlots({ provider, dateStr, durationMin, now = new Date() }) {
  const sch = normalizeSchedule(provider);
  // weekday IST date se nikalo (din ke beech ka time lo taaki timezone shift se din na badle)
  const weekday = new Date(`${dateStr}T12:00:00${IST}`).getDay();

  if (sch.offDates.has(dateStr)) return [];
  const horizon = new Date(now.getTime() + sch.maxAdvanceDays * 864e5);
  const earliest = new Date(now.getTime() + sch.minNoticeHours * 36e5);

  // us din ke active bookings + holds
  const dayStart = istToUtc(dateStr, '00:00'), dayEnd = istToUtc(dateStr, '23:59');
  const [booked, holds] = await Promise.all([
    Appointment.find({ providerUserId: provider.userId, slotActive: true, startAt: { $gte: dayStart, $lte: dayEnd } })
      .select('startAt endAt').lean(),
    SlotHold.find({ providerUserId: provider.userId, startAt: { $gte: dayStart, $lte: dayEnd }, expiresAt: { $gt: now } })
      .select('startAt userId').lean(),
  ]);
  const busy = [...booked.map(b => [b.startAt, b.endAt]),
                ...holds.map(h => [h.startAt, new Date(h.startAt.getTime() + durationMin * 6e4)])];

  const out = [];
  for (const w of sch.windowsFor(weekday)) {
    for (let t = toMin(w.start); t + durationMin <= toMin(w.end); t += durationMin + sch.bufferMin) {
      const hhmm = toHHMM(t);
      const startAt = istToUtc(dateStr, hhmm);
      const endAt = new Date(startAt.getTime() + durationMin * 6e4);
      if (startAt < earliest || startAt > horizon) continue;
      if ((w.breaks || []).some(b => t < toMin(b.end) && t + durationMin > toMin(b.start))) continue;
      if ((sch.disabledByDate[dateStr] || []).includes(to12h(hhmm))) continue;
      if (busy.some(([s, e]) => startAt < e && endAt > s)) continue;          // overlap
      out.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), time: hhmm, label: to12h(hhmm) });
    }
  }
  return out;
}
```
`getSlots` sirf dikhane ke liye hai. **Asli guarantee database ka unique index** hai (5.3).

### 5.3 Hold aur double-booking se bachav
1. **Hold**: `POST /api/mind/availability/hold { providerId, startAt, durationMin }`
```js
await SlotHold.deleteMany({ userId: req.user._id });          // user ek hi slot pakde
try {
  await SlotHold.create({ providerUserId, startAt, userId: req.user._id,
                          expiresAt: new Date(Date.now() + HOLD_MIN * 60000) });
} catch (e) { if (e.code === 11000) return res.status(409).json({ code: 'SLOT_TAKEN' }); throw e; }
```
Unique index `{providerUserId, startAt}` ki wajah se do log ek slot nahi pakad sakte, TTL index MongoDB se auto-expire karta hai.
2. **Book**: booking create hote waqt `Appointment` ka unique partial index `{providerUserId, startAt}` (`slotActive:true`) final guard hai. Duplicate key (11000) = `SLOT_TAKEN`.
3. Booking ke baad hold delete.

---

## 6. Booking create (service)

```js
// bookingService.js
export async function createBooking({ user, body, idempotencyKey }) {
  const dup = await Payment.findOne({ idempotencyKey, patient_id: String(user._id) });
  if (dup) return { duplicate: true, appointmentId: dup.referenceId };

  const provider = await loadProvider(body.providerId);                       // counsellor ya psychiatrist
  const svc = resolveService(provider, body.serviceKey);                      // duration, mode list, price
  if (!svc.modes.includes(body.mode)) throw httpError(400, 'MODE_NOT_SUPPORTED');
  await assertConsent(user._id, provider);                                    // 409 CONSENT_REQUIRED
  if (!(await hasIntake(user._id, provider))) await assertIntakeProvided(body);// pehli baar intake zaroori

  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + svc.durationMin * 6e4);
  await assertHoldOwned(user._id, provider.userId, startAt);                  // 409 HOLD_EXPIRED
  const slotsNow = await getSlots({ provider, dateStr: istDate(startAt), durationMin: svc.durationMin });
  if (!slotsNow.some(s => new Date(s.startAt).getTime() === startAt.getTime())) throw httpError(409, 'SLOT_TAKEN');

  // package se ya paid single
  let pkg = null, payment = null, quote;
  if (body.usePackageId) {
    pkg = await packageService.reserveSession({ userId: user._id, packageId: body.usePackageId, providerUserId: provider.userId, startAt });
  } else {
    quote = await pricingService.quote({ provider, svc, coupon: body.coupon, user });
    payment = await paymentService.charge({ user, quote, method: body.paymentMethod, idempotencyKey,
                                            serviceType: 'mind_session', description: `${provider.name} session` });
  }

  try {
    const appt = await Appointment.create({
      serviceLine: 'mental_health', providerType: provider.kind === 'counsellor' ? 'counsellor' : 'doctor',
      providerUserId: provider.userId, doctorId: provider.doctor?._id || null, counsellorProfileId: provider.profile?._id || null,
      patientId: user._id, patient: body.isAnonymous ? (body.alias || 'Anonymous user') : user.name,
      doctor: provider.name, department: provider.kind === 'counsellor' ? 'Counselling' : 'Psychiatry',
      date: istDate(startAt), time: to12h(istTime(startAt)), startAt, endAt, durationMin: svc.durationMin,
      appointmentMode: svc.legacyMode(body.mode), sessionMode: body.mode,
      type: svc.legacyType(body.mode, body.serviceKey), status: provider.autoConfirm ? 'Confirmed' : 'Pending',
      slotActive: true, concern: body.concern || '', isAnonymous: !!body.isAnonymous, anonymousAlias: body.alias || '',
      packageId: pkg?._id || null, sessionNumber: pkg ? pkg.sessionsUsed + pkg.sessionsReserved : 1,
      supportPlanId: body.planKey || '', fees: quote?.total || 0, meetingProvider: 'inapp',
      crisisFlag: body.crisisFlag || false,
    });
    await SlotHold.deleteMany({ userId: user._id, providerUserId: provider.userId, startAt });
    if (payment) await Payment.updateOne({ _id: payment._id }, { referenceId: String(appt._id) });
    await notify.bookingCreated(appt, provider);           // file 12
    return { appointment: appt, payment };
  } catch (e) {
    // rollback: payment refund / package release
    if (payment) await refundService.auto(payment, 'booking_failed');
    if (pkg) await packageService.releaseReservation(pkg._id);
    if (e.code === 11000) throw httpError(409, 'SLOT_TAKEN');
    throw e;
  }
}
```
Note: MongoDB replica set ho to poore hisse ko `session.withTransaction` me daal do. Standalone Mongo par upar wala compensating rollback pattern kaam karta hai.

Provider confirm/decline (`autoConfirm = false`):
```
POST /api/mind/bookings/:id/confirm   -> status Confirmed, patient ko notification + calendar
POST /api/mind/bookings/:id/decline   -> body {reason}; Cancelled + cancelledBy:'provider'; refund/package release; suggest 3 alternate slots
```
12 ghante me jawab nahi -> job `bookingTimeout` auto-decline + full refund + patient ko "3 aur providers" suggestion.

---

## 7. Packages logic

### 7.1 Purchase
1. Patient package chunta hai (Step 1), payment complete.
2. `UserPackage` create: `sessionsTotal`, `sessionsUsed:0`, `sessionsReserved:0`, `expiryDate` (plan ki duration se, jaise short = 30 din, medium = 60, long = 120; provider ke custom package me apni), `minCadenceDays`.
3. Pehla session usi flow me book hota hai.

### 7.2 Session use (atomic)
```js
// packageService.js
export async function reserveSession({ userId, packageId, providerUserId, startAt }) {
  const pkg = await UserPackage.findOneAndUpdate(
    { _id: packageId, userId, providerUserId, status: 'active', expiryDate: { $gt: startAt },
      $expr: { $lt: [{ $add: ['$sessionsUsed', '$sessionsReserved'] }, '$sessionsTotal'] } },
    { $inc: { sessionsReserved: 1 } }, { new: true });
  if (!pkg) throw httpError(409, 'PACKAGE_UNAVAILABLE');
  if (pkg.minCadenceDays && pkg.lastSessionAt) {
    const gap = (startAt - pkg.lastSessionAt) / 864e5;
    if (gap < pkg.minCadenceDays) { await releaseReservation(pkg._id); throw httpError(409, 'CADENCE_TOO_SOON', { nextAllowed: addDays(pkg.lastSessionAt, pkg.minCadenceDays) }); }
  }
  return pkg;
}
export const releaseReservation = (id) => UserPackage.updateOne({ _id: id, sessionsReserved: { $gt: 0 } }, { $inc: { sessionsReserved: -1 } });
export async function completeSession(pkgId, at) {
  const pkg = await UserPackage.findOneAndUpdate({ _id: pkgId, sessionsReserved: { $gt: 0 } },
    { $inc: { sessionsReserved: -1, sessionsUsed: 1 }, $set: { lastSessionAt: at } }, { new: true });
  if (pkg && pkg.sessionsUsed >= pkg.sessionsTotal) { pkg.status = 'completed'; await pkg.save(); }
  return pkg;
}
```
`$expr` wala condition race-free hai: do parallel bookings me se ek fail hoti hai jab sessions poore reserve ho chuke hon.

### 7.3 Rules
| Rule | Behaviour |
|---|---|
| Expiry | `expiryDate` ke baad `expired`. Bache sessions forfeit (policy: 7 din grace me "extend for Rs X" offer) |
| Cadence | `minCadenceDays` se pehle agla session nahi (UI me dates disabled) |
| Low balance | 1 session bacha -> `mind:package_low` notification + renewal card |
| Provider change | Package ek provider ke saath bandha. Provider chhod de to refund ya reassign (admin) |
| Cancel session | Free cancel window me: `sessionsReserved -1` (session wapas). Late cancel: session `used` maana jata hai (forfeit) |
| Provider cancel | Hamesha session wapas + priority rebook + optional credit |
| No-show patient | Session used |
| No-show provider | Session wapas + compensation credit + provider ko strike |

### 7.4 Refund (unused sessions)
```js
// refundService.js
export function packageRefund(pkg, payment, now = new Date()) {
  const unused = Math.max(0, pkg.sessionsTotal - pkg.sessionsUsed - pkg.sessionsReserved);
  const perSession = payment.amount / pkg.sessionsTotal;
  const daysSincePurchase = (now - pkg.createdAt) / 864e5;
  const fullRefundWindow = daysSincePurchase <= 2 && pkg.sessionsUsed === 0;      // 48 ghante, koi session nahi hua
  const gross = fullRefundWindow ? payment.amount : perSession * unused * 0.9;     // 10% admin fee
  return { unused, perSession, refund: Math.round(gross), fullRefundWindow };
}
```
Percentages policy hai, config me rakho (`mind.refundPolicy`), hardcode nahi.

---

## 8. Pricing

`pricingService.quote({ provider, svc, coupon, user })`:
1. `base` = provider ki service price (counsellor: `sessionPricing` ya package; psychiatrist: consultation fee / follow-up fee ya `supportPlanPrices`).
2. `discount`: first-session offer, referral/rewards (FindMedi rewards system), coupon.
3. `platformFee` (optional flat) aur `tax` (GST, config).
4. `total`.
5. Commission: `platformCommissionPct` (default 20%) sirf internal, patient ko nahi dikhta. `providerShare = base * (1 - pct)`.
Quote server hi banata hai, client ka bheja hua total kabhi nahi maana jata.

---

## 9. Payments

1. `Payment` (existing) me `serviceType: 'mind_session' | 'mind_package'`, `status: pending -> completed | failed -> refunded`.
2. Abhi FindMedi ka payment "demo" hai (`demoPayment.js`). Live gateway (Razorpay etc.) lagane par `paymentService.charge` ek interface hai, baaki code nahi badlega.
3. Idempotency: `Payment.idempotencyKey` unique index.
4. Provider earnings ledger: session **Completed** hone ke 24 ghante baad `payoutStatus:'pending'` -> `payable`. Provider withdraw (existing lawyer `withdraw-demo` jaisa) ya weekly auto payout.
5. Refund: `Payment.status = 'refunded'`, `refund_amount`, aur patient notification + invoice.

---

## 10. Cancellation / reschedule policy (default, admin config)

| Kab | Patient cancel | Refund / package |
|---|---|---|
| 24 ghante se pehle | Free | 100% / session wapas |
| 6 se 24 ghante | Allowed | 50% ya ek free reschedule / session wapas |
| 6 ghante se kam | Allowed | Refund nahi / session used |
| No-show | | Refund nahi / session used |
| Provider cancel (kabhi bhi) | | 100% + priority rebook |
| Provider 10 min me join nahi | Patient "Provider absent" report | 100% + provider strike |

- Reschedule: max 2 baar, kam se kam 6 ghante pehle, naya slot usi flow se (hold + book), payment dobara nahi.
- Grace: session start ke 10 minute tak join hone ki chhoot.
- Crisis wale patient ke liye policy soft: cancel penalty admin discretion.

---

## 11. Psychiatrist-specific rules

| Cheez | Rule |
|---|---|
| Service types | `first_consultation` (45 se 60 min), `follow_up` (20 se 30 min), `medication_review` (15 min) |
| First time | Intake me current medications, allergies, past diagnosis mandatory |
| Records | Patient FindMedi records/reports/prescriptions (consent ke saath) provider ko dikhte |
| Prescription | Session ke baad `RxWriter` (file 10). Refill request alag flow |
| Follow-up | Provider follow-up date set kare to patient ko "Book follow-up" |
| Emergency | Psychiatrist `crisisOnCall` ho to urgent slots |
| Age | 18+ default; minors ke liye guardian consent phase 2 |

## 12. Counsellor types

`professional` (qualified therapist) aur `mentor` (peer/support mentor). Mentors ke liye profile par disclaimer: "Mentor therapy ya medication nahi dete." Mentor **crisis** handle nahi karte, crisis flag par turant professional/on-call provider ko escalate. Mentors ke pricing/packages chhote hote hain.

---

## 13. API list

| Method | Path | Role | Kaam |
|---|---|---|---|
| GET | `/api/public/mind/providers` | public | Discovery |
| GET | `/api/public/mind/providers/:id` | public | Profile |
| GET | `/api/mind/availability/:providerId?date=YYYY-MM-DD&service=` | patient | Slots |
| POST | `/api/mind/availability/hold` | patient | Slot pakdo |
| DELETE | `/api/mind/availability/hold` | patient | Chhodo |
| POST | `/api/mind/bookings/quote` | patient | Price |
| POST | `/api/mind/bookings` | patient | Create (Idempotency-Key) |
| GET | `/api/mind/bookings/my?status=&from=&to=` | patient | Meri bookings |
| GET | `/api/mind/bookings/:id` | patient/provider | Detail |
| POST | `/api/mind/bookings/:id/cancel` | patient/provider | Cancel |
| POST | `/api/mind/bookings/:id/reschedule` | patient | Reschedule |
| POST | `/api/mind/bookings/:id/confirm` | provider | Confirm |
| POST | `/api/mind/bookings/:id/decline` | provider | Decline |
| POST | `/api/mind/packages/purchase` | patient | Package kharido |
| GET | `/api/mind/packages/my` | patient | Meri packages |
| POST | `/api/mind/packages/:id/refund` | patient | Refund request |
| POST | `/api/mind/intake` | patient | Intake submit |
| GET | `/api/mind/intake/status?providerId=` | patient | Intake exist? |
| POST | `/api/mind/consent` | patient | Consent |
| GET | `/api/mind/consent/status` | patient | |
| POST | `/api/mind/waitlist` | patient | Notify me |

Error codes: `SLOT_TAKEN`, `HOLD_EXPIRED`, `CONSENT_REQUIRED`, `INTAKE_REQUIRED`, `MODE_NOT_SUPPORTED`, `PACKAGE_UNAVAILABLE`, `CADENCE_TOO_SOON`, `PROVIDER_UNAVAILABLE`, `PAYMENT_FAILED`, `TOO_LATE_TO_CANCEL`, `RESCHEDULE_LIMIT`.

Validation (zod) example:
```js
export const createBookingSchema = z.object({
  providerId: z.string().length(24),
  serviceKey: z.enum(['single', 'first_consultation', 'follow_up', 'medication_review', 'one_time', 'short_term', 'medium_term', 'long_term', 'custom']),
  planKey: z.string().max(60).optional(),
  usePackageId: z.string().length(24).optional(),
  mode: z.enum(['video', 'audio', 'chat', 'in_person']),
  startAt: z.string().datetime(),
  concern: z.string().max(300).optional(),
  isAnonymous: z.boolean().optional(),
  alias: z.string().max(40).optional(),
  paymentMethod: z.enum(['card', 'upi', 'netbanking', 'wallet']).optional(),
  coupon: z.string().max(30).optional(),
}).strict();
```

---

## 14. Booking state (text)

| Status | Kaise banta hai | Aage kaha jata hai |
|---|---|---|
| (hold) | Slot pakda, payment baaki | Expire ya book |
| `Pending` | Booking bani, provider approval baaki (`autoConfirm=false`) | `Confirmed` (provider) / `Cancelled` (decline, timeout) |
| `Confirmed` | Auto ya provider ne confirm kiya | Session ke baad `Completed` / `Missed` / `Cancelled` |
| `Completed` | Provider "Complete" ya session auto-end | (final) |
| `Missed` | Patient join nahi hua (grace ke baad) | (final, `noShow:'patient'`) |
| `Cancelled` | Patient/provider/system ne cancel kiya | (final, `cancelledBy`) |

In-session state alag fields me: `joinedAt.patient/provider`, `endedAt` (status nahi badalta).

---

## 15. Test scenarios (booking)

| # | Scenario | Expected |
|---|---|---|
| 1 | Do users ek slot ek saath pakadte hain | Ek ko `SLOT_TAKEN` |
| 2 | Hold expire hone ke baad book | `HOLD_EXPIRED`, slot free |
| 3 | Payment fail | Hold 5 min tak, retry ho sakti hai, appointment nahi |
| 4 | Appointment create fail (11000) | Payment auto-refund |
| 5 | Package ka aakhri session do parallel booking | Ek fail `PACKAGE_UNAVAILABLE` |
| 6 | Cadence 7 din, 3 din baad book | `CADENCE_TOO_SOON` |
| 7 | 25h pehle cancel | 100% refund |
| 8 | 3h pehle cancel | Refund 0, session used |
| 9 | Provider decline | Refund + 3 alternate slots |
| 10 | Provider 12h me jawab nahi | Auto-decline + refund |
| 11 | Anonymous booking | Provider ko alias dikhe |
| 12 | Consent bina booking | `CONSENT_REQUIRED` |
| 13 | Pehli baar intake bina | `INTAKE_REQUIRED` |
| 14 | Psychiatrist follow-up | 20 min slot, follow-up fee |
| 15 | Same request 2 baar (double click) | Ek hi booking (idempotency) |

# 07 — Session Room + Care Delivery (Session se leke Notes/Homework tak)

Ye file booking ke **baad** kya hota hai wo cover karti hai: session join se leke khatam hone tak, notes, homework, follow-up. File 06 ne booking tak le aaya tha, ye file wahan se aage.

Ek naya finding is file ke shuru me: repo me ek **teesra, bilkul alag mental-health module** pehle se hai jo MindSupport se koi lena-dena nahi rakhta. Confuse na ho, isliye pehle ye clear karte hain.

---

## 0. Naming collision: `MentalHealth` (hospital-side) vs Mind (patient-side)

**Repo me abhi:** `backend/src/models/MentalHealth.js`, `backend/src/routes/mentalhealth.js`, `frontend/src/pages/MentalHealth.tsx` — ye ek **hospital_admin ke liye referral/case-management module** hai (sidebar me `{ icon: Brain, labelKey: 'nav.mentalHealth', path: '/mentalhealth' }`, `hospital_admin` role ke andar). Isme `referralId`, `assessment.mentalStatus`, `treatmentPlan`, `sessions[]`, `medications[]`, `consents[]` jaise fields hain — matlab ek hospital ke andar psychiatry department ka case-file system, jaisे IPD/OPD records ka ek hissa. Frontend `MentalHealth.tsx` ke API calls abhi mock hain (`Promise.resolve([])`), yaani ye feature khud FindMedi me adhura/stub hai.

**Ye MindSupport (counsellor/psychiatrist booking, packages, wellness) se bilkul alag cheez hai.** Do alag audiences: `MentalHealth` model hospital staff ke liye internal case notes hai (jaise IPD chart), Mind module patient-facing booking/wellness platform hai.

**Faisla:**
1. Naam collision na ho isliye naye Mind models `mind/` folder ke andar hi rakhna (file 03 me already `models/mind/*` decided tha), root `models/` me nahi.
2. `MentalHealth.js` ko **hata nahi rahe, na is merge ka hissa bana rahe hain**. Ye alag scope hai — agar future me hospital ke IPD psychiatry department ko bhi Mind ke booking engine se jodna ho (jaise ek hospitalised patient ka psychiatrist follow-up Mind se book ho), to wo alag proposal hoga, is merge ka nahi.
3. Agar kabhi in dono ko jodna pade: `MentalHealth.referralId` ko `Appointment` se link karne wala ek optional field (`sourceReferralId`) add kar sakte ho, par abhi zaroorat nahi — scope creep na banao.
4. Sidebar me `hospital_admin` ka "Mental Health" (`/mentalhealth`) aur patient ka "Mind & Wellness" (file 08) do alag labels/icons rakhna, taaki koi confuse na ho ki dono same feature hain.

---

## 1. Session lifecycle (text flow)

```
Confirmed appointment
  -> Reminder (24h, 1h, 10min) [file 12]
  -> Pre-session check (patient + provider, 5 min pehle se available)
  -> Join (patient ya provider, jo pehle aaye "waiting" state)
  -> Both joined -> session "live"
  -> [video/audio/chat room, timer]
  -> Provider "End session" (ya auto-end duration ke baad + 5 min grace)
  -> Post-session: provider notes, patient ko summary (agar shared), homework assign
  -> Package/earnings update (file 06 ka completeSession)
  -> Follow-up prompt (patient ko "Book next session" agar package me bacha hai)
```

Status khud nahi badalta jab tak koi in states se guzre — `Appointment.status` sirf Confirmed -> Completed/Missed/Cancelled hota hai (file 06, section 14). In-session detail alag fields me (`joinedAt`, `endedAt`).

---

## 2. Pre-session (5 minute pehle se)

### 2.1 `PreSessionCheck.tsx`
- Camera/mic permission test (video mode ke liye), speaker test.
- Network check (simple ping/latency badge: Good/OK/Poor).
- "Discreet mode" reminder agar patient ne on kiya hai (file 05, section 9): "Quick exit button upar right me hai."
- Intake/consent already diya hai to skip, warna yahi se complete karwao (edge case: package se direct book hua ho aur consent purana ho gaya ho).
- Crisis banner agar `Assessment.itemNineFlag` ya `crisisFlag` set hai us appointment par: "Agar aap is waqt khatre me hain, session shuru hone se pehle bhi helpline available hai" + helpline numbers.

### 2.2 Waiting room
- Jo pehle join kare, use "Provider/Patient join hone ka intezar" screen dikhe, dusra join hote hi dono "live" ho jate hain.
- Provider 10 minute tak na aaye to patient ko "Provider late hai, thoda intezar karein ya reschedule karein" (file 06 cancellation policy se link).
- Patient 10 minute tak na aaye to provider "Mark as no-show" kar sakta hai (grace ke baad hi enable hota hai).

---

## 3. In-session (video / audio / chat)

**Repo me abhi:** FindMedi ke paas already `VideoCallContext`, `AudioCallContext` (WebRTC via Socket.IO signalling), `frontend/src/pages/doctor/DoctorVideoCallRoom.tsx`, `DoctorCallRoom.tsx` hain doctor consultations ke liye. Mind ke liye **naya call system nahi banega**, isi ko reuse karenge, bas `appointment.serviceLine === 'mental_health'` hone par UI me chhote farak (section 3.3).

### 3.1 Session room component (`SessionRoom.tsx`)
```tsx
// features/mind/session/SessionRoom.tsx
export default function SessionRoom() {
  const { appointmentId } = useParams();
  const { data: appt } = useAppointment(appointmentId);   // react-query
  const socket = useSocket();

  useEffect(() => {
    socket.emit('mind:join_session', { appointmentId }, (ack) => {
      if (!ack.ok) { toast.error('Session join nahi ho paya'); return; }
    });
    return () => socket.emit('mind:leave_session', { appointmentId });
  }, [appointmentId]);

  if (appt.sessionMode === 'video') return <VideoCallContext.Provider><VideoRoomShell appt={appt} /></VideoCallContext.Provider>;
  if (appt.sessionMode === 'audio') return <AudioCallContext.Provider><AudioRoomShell appt={appt} /></AudioCallContext.Provider>;
  if (appt.sessionMode === 'chat')  return <SessionChat appointmentId={appointmentId} />;
  return <InPersonCheckIn appt={appt} />;                 // in_person: sirf check-in/notes, koi call nahi
}
```

### 3.2 Socket events (file 02, section 7 se extend)
```js
// socketService.js me existing io.on('connection') ke andar
socket.on('mind:join_session', async ({ appointmentId }, ack) => {
  const appt = await Appointment.findById(appointmentId).select('patientId providerUserId status startAt endAt sessionMode');
  const allowed = appt && ['Confirmed'].includes(appt.status)
    && [String(appt.patientId), String(appt.providerUserId)].includes(socket.userId);
  if (!allowed) return ack?.({ ok: false, code: 'NOT_ALLOWED' });
  socket.join(`appointment:${appointmentId}`);
  const role = String(appt.patientId) === socket.userId ? 'patient' : 'provider';
  await Appointment.updateOne({ _id: appointmentId }, { $set: { [`joinedAt.${role}`]: new Date() } });
  io.to(`appointment:${appointmentId}`).emit('mind:session_joined', { role, at: new Date() });
  ack?.({ ok: true, role });
});

socket.on('mind:leave_session', ({ appointmentId }) => socket.leave(`appointment:${appointmentId}`));

socket.on('mind:end_session', async ({ appointmentId }, ack) => {
  const appt = await Appointment.findById(appointmentId);
  if (String(appt.providerUserId) !== socket.userId) return ack?.({ ok: false });   // sirf provider end kare
  await sessionService.completeSession(appt);                                        // section 5
  io.to(`appointment:${appointmentId}`).emit('mind:session_ended', { at: new Date() });
  ack?.({ ok: true });
});
```

### 3.3 UI farak (medical call room ke mukable)
| Cheez | Doctor call room (existing) | Mind session room (naya, wahi shell reuse) |
|---|---|---|
| Header | Doctor naam, department | Provider naam + "Confidential session" badge |
| Patient naam | Full naam | Alias agar `isAnonymous` |
| Notes panel | Prescription-focused | SOAP/free-form note (section 4), encrypted |
| End action | "Complete & prescribe" | "Complete & add notes" |
| Timer | Simple | Soft warning 5 min pehle ("5 minute bache hain") |
| Crisis button | Nahi | Provider side "Flag safety concern" button (file 12) hamesha visible |
| Quick exit | Nahi | Patient side hamesha visible (discreet mode) |

### 3.4 In-person mode
Video/audio room nahi khulta. `InPersonCheckIn.tsx`: appointment detail (address agar clinic-based counsellor), "Mark arrived" (patient), provider "Start session" (in-app timer shuru, notes wahi se), "Complete session" end me. Home-visit counsellor abhi scope me nahi (Doctor ke home_visit flag jaisa future me add ho sakta hai, filhaal sirf clinic in-person).

### 3.5 Secure chat (mode = chat, ya kisi bhi mode ke saath side-chat)
- `MindMessage` model (file 04, section 3.10) me store, text field AES-256-GCM encrypted (session-level key nahi, per-message field encryption reuse `crypto.js` se).
- Existing FindMedi `chat.js` pattern follow karo (socket + REST hybrid: socket real-time, REST history load).
- Typing indicator, read receipt reuse existing chat component se, sirf endpoint `mind:message` prefix.
- Attachment (image/pdf): Cloudinary, `mind/{appointmentId}` folder, size limit 5MB, sirf active relationship ke logo allowed.

---

## 4. Session notes (provider-only, encrypted)

### 4.1 Note types
- **SOAP** (Subjective, Objective, Assessment, Plan) — professional counsellor/psychiatrist ke liye default.
- **Free-form** — mentor type counsellor ke liye (file 06, section 12).
- **Risk note** — jab bhi `riskLevel` moderate/high mark ho, alag flagged entry, crisis service ko bhi trigger kare (file 12).

### 4.2 UI (`SessionNoteEditor.tsx`, provider side, session room ke andar ek collapsible panel)
```
[ SOAP | Free-form ] toggle
Subjective: (textarea, patient ne kya bataya)
Objective:  (textarea, provider ne kya observe kiya)
Assessment: (textarea, clinical impression)
Plan:       (textarea, agla step)
Risk level: None / Low / Moderate / High   <- High/Moderate select hote hi CrisisBanner trigger
Patient summary (optional, patient ko dikhega): (chhota textarea, 300 char max)
[Save draft]  [Save & Complete session]
```
Auto-save draft har 30 second (local + debounce server save), taaki call drop hone par note na khoye.

### 4.3 Backend save (`sessionService.js`)
```js
export async function saveNote({ appointmentId, providerUserId, patientUserId, body }) {
  const enc = encryptField(JSON.stringify({ subjective: body.subjective, objective: body.objective,
                                             assessment: body.assessment, plan: body.plan }));
  const last = await SessionNote.findOne({ appointmentId }).sort({ version: -1 });
  const note = await SessionNote.create({
    appointmentId, providerUserId, patientUserId, version: (last?.version || 0) + 1,
    kind: body.kind || 'soap', enc, riskLevel: body.riskLevel || 'none',
  });
  if (body.patientSummary) await Appointment.updateOne({ _id: appointmentId }, { patientSummary: sanitize(body.patientSummary) });
  if (['moderate', 'high'].includes(body.riskLevel)) await crisisService.raise({ userId: patientUserId, source: 'provider_flag', severity: body.riskLevel, appointmentId });
  return note;
}
```
`Appointment.patientSummary` naya plain field (file 04 me add karna, encrypted nahi kyunki patient khud dekhega, par phir bhi access control se protected).

### 4.4 Kaun dekh sakta hai
File 05 ka `canReadNote`: sirf wahi provider jisne likha, patient kabhi nahi (sirf `patientSummary`). Admin kabhi nahi (break-glass ke alawa).

---

## 5. Session complete hona

```js
// sessionService.js
export async function completeSession(appt) {
  await Appointment.updateOne({ _id: appt._id }, { status: 'Completed', endedAt: new Date() });
  if (appt.packageId) await packageService.completeSession(appt.packageId, new Date());   // file 06, 7.2
  await earningsService.markPayable(appt._id, { delayHours: 24 });                        // file 06, section 9
  await notify.sessionCompleted(appt);                                                     // file 12
  // package low check
  const pkg = appt.packageId ? await UserPackage.findById(appt.packageId) : null;
  if (pkg && pkg.sessionsTotal - pkg.sessionsUsed === 1) await notify.packageLow(pkg);
}
```
Auto-end (patient/provider dono disconnect ho jayen aur duration + 5 min grace bhi paar ho jaye): cron job `noShowSweeper.job.js` (file 12) check karta hai.

---

## 6. Homework / Assignments

### 6.1 Provider assign karta hai (post-session ya kabhi bhi)
```
Assignment: { appointmentId, providerUserId, patientUserId, title, instructions,
              type: reading|exercise|journal|breathing|custom, resourceId (optional link to MindResource),
              dueDate, status: assigned }
```
UI: `AssignHomework.tsx` (provider dashboard "Homework" tab, file 09), aur patient side `Homework.tsx` (file 08).

### 6.2 Patient completes
- `status: assigned -> in_progress -> completed/skipped`.
- Completion par optional `patientNote` ("kaisa laga, kya seekha").
- Complete hote hi provider ko notification (`mind:homework_assigned` reverse — naya event `mind:homework_completed`).
- Provider agle session me homework history dekh sakta hai (client detail view).

---

## 7. Follow-up

1. Session complete hone ke baad "Done" screen: "Agla session book karein?" (agar package me sessions bache) ya "Single session book karein".
2. Psychiatrist follow-up: provider notes me "follow up in N days" set kare (`TreatmentPlan.nextReviewAt` ya `PsychRxMeta.followUpInDays`) to patient ko us date ke aas-paas reminder + "Book follow-up" CTA (file 12 reminder job).
3. Package khatam ho gaya aur patient ne renew nahi kiya: 7 din baad ek soft reminder ("Aapka wellness journey jaari rakhna chahte hain?"), phir band — spam nahi karna.

---

## 8. Post-session patient side

`PostSession.tsx` (patient, session khatam hote hi):
1. Optional quick mood check (1 tap, 5 emoji scale) -> `MoodEntry` me save ho sakta hai agar patient chahe.
2. Homework agar assign hua turant dikhe.
3. Review prompt (sirf 3rd session ke baad se, har baar nahi — annoying na ho): "Session kaisa raha?" -> `Review` create.
4. "Session summary" (`patientSummary` field agar provider ne bhara) collapsible card me.
5. Next session suggestion (section 7).

---

## 9. Reschedule / cancel from session context

Agar session start hone se pehle hi koi cancel/reschedule kare, wahi file 06 section 10 wala flow. Agar session **beech me hi** disconnect ho jaye (network issue):
1. Dono side "Reconnecting..." UI, socket automatically dobara `mind:join_session` try karta hai (existing call context ka reconnect logic reuse).
2. 3 minute tak reconnect na ho to provider ko option: "Session yahin khatam karo aur reschedule offer karo" ya "Wait karo".
3. Technical issue ki wajah se session na ho paye to `cancelledBy: 'system'`, full refund/session wapas, koi penalty nahi.

---

## 10. Test scenarios (session)

| # | Scenario | Expected |
|---|---|---|
| 1 | Patient session room kholta hai jiska wo part nahi | `mind:join_session` ack `{ok:false}`, room join nahi hota |
| 2 | Note save karte waqt connection jaye | Auto-save draft local me bacha rehta, reconnect par sync |
| 3 | Provider risk level "High" mark kare | `CrisisEvent` create, admin + on-call notify (file 12) |
| 4 | Dono disconnect, wapas na aayein | `noShowSweeper` job session auto-cancel/complete kare duration ke baad |
| 5 | Homework complete karne ke baad | Provider ko notification, client detail me dikhe |
| 6 | In-person mode | Video/audio UI bilkul na khule, sirf check-in + notes |
| 7 | Anonymous session | Provider side patient naam kahin na dikhe, sirf alias |


# 08 — Unified Patient Dashboard ("Mind & Wellness" FindMedi ke andar)

Ye file wahi cheez cover karti hai jo tumne sabse pehle maangi thi: **do alag dashboard ek na lagein**. Neeche sab kuch repo ki asli files padh ke likha hai (`AppSidebar.tsx`, `frontend/src/mind/pages/UserDashboard.jsx`, `MindSidebar.tsx`), koi assumption nahi.

---

## 1. Abhi kya hai (proof)

**Repo me abhi**, patient ke do bilkul alag "ghar" hain:
1. `/dashboard` + `/patient/*` — `AppSidebar.tsx` ka `patient` nav array (30+ items), `DashboardLayout.tsx` shell.
2. `/mind/user` — `MindSidebar.tsx` ka apna nav (`Mind Home, Find Counsellor, Find Psychiatrist, Resources, Peer Support, My Wellness, Session Schedule`), apna `MindDashboardLayout.tsx`, apna Redux `Provider`, apna `ThemeProvider`/`LanguageProvider`.
3. `UserDashboard.jsx` (2830 lines) ke andar internal tabs (`MindSidebar.tsx` se confirm kiya): `home, wellness, packages, sessions, schedule, history, prescriptions (label "Treatment"), assignments, journal, settings`.

Do sidebar, do theme system, do "Home" button — yahi wo cheez hai jo "alag app jaisa" lagta hai.

---

## 2. Target: Ek sidebar, ek dashboard, expandable section

**Achi khabar:** `AppSidebar.tsx` me **already** ek expandable-group pattern maujood hai — patient nav me "My Health" section (`Medicine Reminders`, `My Vitals`, `Care Plans` par `isHealth: true` flag), aur ek `myHealthOpen` state jo collapse/expand karta hai. Naya pattern invent nahi karna — **hubahu wahi pattern copy karke "Mind & Wellness" group banega**.

### 2.1 `navConfig.patient` me add (AppSidebar.tsx)
```js
patient: [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard',        path: '/dashboard' },
  { icon: Bot,             labelKey: 'nav.chatWithAI',       path: '/ai-chat' },
  // ...existing consultation modes, records, etc (jaisa hai waisa rehta hai)...

  // 🧠 Mind & Wellness (expandable parent section, "My Health" jaisa pattern)
  { icon: Brain,  labelKey: 'nav.mindHome',        path: '/patient/mind',            isMind: true },
  { icon: Search, labelKey: 'nav.findMindCare',    path: '/find-care/mind',          isMind: true },
  { icon: ClipboardList, labelKey: 'nav.mySessions', path: '/patient/mind/sessions', isMind: true },
  { icon: Calendar, labelKey: 'nav.mindSchedule',  path: '/patient/mind/schedule',   isMind: true },
  { icon: Package, labelKey: 'nav.myPackages',     path: '/patient/mind/packages',   isMind: true },
  { icon: Activity, labelKey: 'nav.wellnessTools', path: '/patient/mind/wellness',   isMind: true },
  { icon: NotebookPen, labelKey: 'nav.journal',    path: '/patient/mind/journal',    isMind: true },
  { icon: FileText, labelKey: 'nav.homework',      path: '/patient/mind/homework',   isMind: true },
  { icon: BookOpen, labelKey: 'nav.mindResources', path: '/patient/mind/resources',  isMind: true },
  { icon: Users,   labelKey: 'nav.peerSupport',    path: '/patient/mind/peer',       isMind: true },

  // ...baaki existing patient items (payment history, addresses, notifications, rewards...) jaise hain waise...
],
```
`Brain` icon already import hoti hai (`hospital_admin` ke "Mental Health" nav item me use ho rahi hai — file 07 ka naming-collision note yaad rakhna, koi problem nahi kyunki icon reuse hona valid hai, label alag hai).

### 2.2 Render logic (`isHealth` ka jo pattern hai wahi `isMind` ke liye)
`SidebarContent` me:
```jsx
const [myHealthOpen, setMyHealthOpen] = useState(true);
const [mindOpen, setMindOpen] = useState(false);   // default collapsed, taaki 30+ item list lamba na dikhe
```
Aur render me `isHealth` ke saath-saath `isMind` ke liye same block duplicate karo (color alag: rose ki jagah violet/indigo, "My Health" ki jagah "Mind & Wellness" text, `Heart` icon ki jagah `Brain`):
```jsx
const { icon: Icon, labelKey, path, isHealth, isMind } = item;
const isFirstMind = isMind && (idx === 0 || !navItems[idx - 1]?.isMind);
if (isMind && !mindOpen && !collapsed && !isActive) {
  return isFirstMind ? (
    <button onClick={() => setMindOpen(true)} className="... text-violet-500 ...">
      <Brain className="w-3.5 h-3.5" /> <span>Mind & Wellness</span> <ChevronRight />
    </button>
  ) : null;
}
// ...baaki hubahu wahi jo isHealth ke liye hai, bas class rose-500 -> violet-500, Heart -> Brain
```
Isse patient ko dikhta hai: ek sidebar, upar normal appointments/records, neeche ek collapsible "Mind & Wellness" group jo bilkul "My Health" jaisa feel deta hai — **naya UI pattern nahi, jo already trust-worthy lag raha hai wahi extend hua**.

### 2.3 `roleBadgeColor`, theme, language — sab main se
Mind ka apna `ThemeContext`/`LanguageContext` **delete** (file 02, section 3.3 me already decide ho chuka tha). `/patient/mind/*` routes `DashboardLayout` (existing) ke andar render honge, `MindDashboardLayout.tsx` **delete**.

---

## 3. Route structure (`/patient/mind/*`)

| Purana (`/mind/user` internal tab) | Naya route | File |
|---|---|---|
| `home` | `/patient/mind` | `user/MindHome.tsx` |
| `wellness` | `/patient/mind/wellness` | `user/Wellness.tsx` (sub-tabs: Mood, Assessments, Goals) |
| `packages` | `/patient/mind/packages` | `user/MyPackages.tsx` |
| `sessions` | `/patient/mind/sessions` | `user/MySessions.tsx` |
| `schedule` | `/patient/mind/schedule` | `user/MySchedule.tsx` |
| `history` | `/patient/mind/sessions?filter=past` | (MySessions ka hi filter, alag page nahi) |
| `prescriptions` (Treatment) | `/patient/mind/treatment` | `user/Treatment.tsx` |
| `assignments` | `/patient/mind/homework` | `user/Homework.tsx` |
| `journal` | `/patient/mind/journal` | `user/Journal.tsx` |
| `settings` | `/patient/mind/settings` (ya existing `/patient/settings` me ek section) | `user/MindSettings.tsx` |

`history` ko alag page na rakh ke `MySessions` ka filter banaya — 10 chhoti files ki jagah 9, aur ek jagah sessions dekhna zyada natural hai.

Purane `/mind/*` paths **redirect** karte hain naye par (file 03, section 4 ka table wahi hai, dobara nahi likh raha).

---

## 4. `MindHome.tsx` — dashboard ka pehla page

Layout upar se neeche (widgets, existing `PatientDashboard.tsx` ke widget-card style se match karte hue):

```
┌─────────────────────────────────────────────┐
│ "Kaise feel kar rahe hain aaj?" quick mood   │  <- 5 emoji tap, optional, MoodEntry me save
├─────────────────────────────────────────────┤
│ Next session card (agar koi upcoming hai)    │  <- provider photo, date/time, Join button
│  ya "Koi session scheduled nahi" + Book CTA  │
├─────────────────────────────────────────────┤
│ Active package(s) progress bar               │  <- "3/6 sessions used", renew CTA agar low
├─────────────────────────────────────────────┤
│ Pending homework (agar hai)                  │  <- chhoti list, "Mark complete" inline
├─────────────────────────────────────────────┤
│ Wellness snapshot (mini chart)               │  <- last 7 din mood trend (recharts)
├─────────────────────────────────────────────┤
│ Resources carousel                            │  <- 3-4 suggested articles/videos
├─────────────────────────────────────────────┤
│ Crisis/helpline footer (hamesha visible)      │  <- file 05 section 8 wala disclaimer
└─────────────────────────────────────────────┘
```

```tsx
// features/mind/user/MindHome.tsx
export default function MindHome() {
  const { data: home } = useMindHomeSummary();     // GET /api/mind/wellness/home-summary (ek aggregate endpoint)
  return (
    <div className="space-y-4">
      <QuickMoodCheck />
      <NextSessionCard session={home?.nextSession} />
      {home?.packages?.map(p => <PackageProgressCard key={p._id} pkg={p} />)}
      {home?.pendingHomework?.length > 0 && <HomeworkPreview items={home.pendingHomework} />}
      <MoodTrendMini data={home?.moodTrend} />
      <ResourceCarousel items={home?.suggestedResources} />
      <DisclaimerFooter />
    </div>
  );
}
```
Ek aggregate backend endpoint (`GET /api/mind/wellness/home-summary`) banao taaki dashboard load pe 6 alag calls na ho — file 02 ka performance target (`< 2.5s`) isi se meet hota hai.

---

## 5. Baaki pages (summary, detail file 06/07 me hai)

| Page | Kya dikhata hai | Backend se |
|---|---|---|
| `MySessions.tsx` | Upcoming/Past tabs, Join/Cancel/Reschedule/Review buttons | `/api/mind/bookings/my` |
| `MySchedule.tsx` | Calendar view (month/week), sessions dots | same, calendar-formatted |
| `MyPackages.tsx` | Active/expired/completed cards, "Buy new", refund request | `/api/mind/packages/my` |
| `Wellness.tsx` | Sub-tabs: Mood log (calendar heatmap), Assessments (PHQ-9/GAD-7 history + retake), Goals | `/api/mind/wellness/*` |
| `Journal.tsx` | List + editor, "Share with provider" toggle per entry | `/api/mind/wellness/journal` |
| `Homework.tsx` | Assigned/In-progress/Completed, mark complete + note | `/api/mind/treatment/assignments` |
| `Treatment.tsx` | Prescriptions (link to existing `PatientPrescriptions.tsx` filtered `serviceType`), Treatment plan summary | existing `Prescription` API + `TreatmentPlan` |
| `MindSettings.tsx` | Anonymous default, discreet notifications toggle, sharing toggles (file 05 §8), safety plan link | `/api/mind/safety`, user settings |

Har page `features/mind/api/*` hook se data leta hai (react-query), component me seedha axios nahi (file 03, naming conventions section 5, rule #2 — wahi follow hoga).

---

## 6. Notification bell — ek hi

Mind ke events (`mind:booking_status`, `mind:session_starting`, `mind:homework_assigned`, `mind:package_low`, `mind:crisis_alert` provider/admin ke liye) existing `NotificationContext` + `Notification` model me jate hain (file 04, section 2.5: naye `type` values `mind_session`, `mind_message`, `mind_homework`, `mind_crisis`). Bell icon wahi rehta hai jo abhi hai, do bell **nahi** honge.

Discreet mode ON ho to `Notification.title`/`body` generic ban jate hain (`"Session"` ki jagah `"Appointment"`), ye ek serializer-level cheez hai (`notify.js` me `if (user.mindSettings?.discreet) sanitizeGeneric(payload)`).

---

## 7. Onboarding (pehli baar Mind kholna)

Patient pehli baar `/patient/mind` par aaye (sidebar se ya kahin se link click kare):
1. Agar first visit (`user.mindOnboarded !== true`): ek dismissible welcome card — "Mind & Wellness me aapka swagat hai. Ye kya hai, privacy kaise kaam karti hai, 3 bullet points" + "Samajh gaya" button.
2. Dismiss karne par `User.mindOnboarded = true` set, dobara na dikhe.
3. Koi alag "signup" nahi — patient already FindMedi user hai, seedha andar (file 05, section 2.1).

---

## 8. Mobile responsiveness

- Sidebar collapse hone par (mobile `Sheet` component existing), "Mind & Wellness" group icon-only dikhega, tap karne par flyout/expand — same jo "My Health" ka mobile behaviour hai, kuch naya nahi likhna.
- `MindHome.tsx` cards mobile par single column stack.

---

## 9. Data hooks (`features/mind/api/wellness.ts` example)

```ts
export function useMindHomeSummary() {
  return useQuery({ queryKey: ['mind', 'home-summary'], queryFn: () => client.get('/wellness/home-summary').then(r => r.data) });
}
export function useMoodEntries(range = 30) {
  return useQuery({ queryKey: ['mind', 'mood', range], queryFn: () => client.get(`/wellness/mood?days=${range}`).then(r => r.data) });
}
export function useLogMood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => client.post('/wellness/mood', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mind', 'mood'] }),
  });
}
```

---

## 10. Migration note (routing continuity)

Migration ke baad purana bookmark `/mind/user` kisi ke paas ho sakta hai (email me link, browser history). `App.tsx` me redirect table (file 03, section 4) ke saath ek catch: `/mind/*` jo table me nahi hai wo bhi generic `/patient/mind` par fallback kare, 404 na de.

## 11. Test checklist (dashboard merge)

| # | Check | Expected |
|---|---|---|
| 1 | Patient login karke sidebar dekhe | Ek hi sidebar, "Mind & Wellness" group niche collapsed |
| 2 | Group expand kare | Same visual language jo "My Health" ka hai (border, indent, color hierarchy) |
| 3 | `/mind/user` type kare (purana bookmark) | Redirect `/patient/mind` par, data waisa hi dikhe |
| 4 | Notification bell | Mind ka event bhi usi bell me aaye, alag bell nahi |
| 5 | Theme dark/light toggle | Mind pages bhi turant badlein (koi alag theme reset na ho) |
| 6 | Language Hindi/English switch | Mind ke labels bhi badlein (i18n keys `mind.*` file 03 §5) |
| 7 | Mobile | Sidebar collapse/expand sahi kaam kare, koi horizontal scroll na ho |


# 09 — Counsellor Dashboard (Poora, Booking se Earnings tak)

**Repo me abhi confirm kiya:** `frontend/src/mind/pages/CounsellorDashboard.jsx` (3015 lines) me `TabsTrigger` se ye exact 10 tabs milte hain: `overview, schedule, sessions, patients, notes, earnings, history, reviews, resources, settings`. Ye file inhi 10 ko naye, chhote files me todti hai (file 03, naming convention: ek file 400 line se badi nahi).

**Pattern jahan se copy karna hai:** `frontend/src/pages/lawyer/LawyerDashboard.tsx` (1010 lines) — Lawyer bhi ek "naya provider role jo admin approve karta hai" hai, isi structure ko counsellor ke liye follow karenge. **Ek bug jo copy NAHI karna:** LawyerDashboard ka tab state sirf local `useState<'overview'|'requests'|...>` hai, URL se sync nahi (`AppSidebar` `?tab=requests` bhejta hai par component ignore karta hai — refresh par tab `overview` pe reset ho jata hai). Counsellor dashboard me `useSearchParams` se URL sync karna, taaki refresh/share/back-button sab kaam karein.

---

## 1. Route aur tab shell

```
/counsellor/dashboard?tab=overview|requests|sessions|schedule|clients|notes|homework|packages|earnings|resources|reviews|profile|verification|settings
```
(Mind ke `patients` ka naam `clients` kiya — patient word medical connotation deta hai, counsellor ke liye "client" zyada theek hai. `homework` aur `packages` naye tabs hain jo mind me nahi the alag se, ab explicit.)

```tsx
// features/mind/counsellor/CounsellorDashboard.tsx
export default function CounsellorDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (t: string) => setSearchParams({ tab: t });
  const { data: profile } = useCounsellorProfile();

  if (profile?.verificationStatus === 'pending') return <VerificationPendingScreen profile={profile} />;
  if (profile?.verificationStatus === 'rejected') return <VerificationRejectedScreen profile={profile} />;

  return (
    <div>
      <CounsellorTabBar tab={tab} onChange={setTab} unreadCounts={profile?.badges} />
      {tab === 'overview'      && <tabs.Overview />}
      {tab === 'requests'      && <tabs.Requests />}
      {tab === 'sessions'      && <tabs.Sessions />}
      {tab === 'schedule'      && <tabs.Schedule />}
      {tab === 'clients'       && <tabs.Clients />}
      {tab === 'notes'         && <tabs.Notes />}
      {tab === 'homework'      && <tabs.Homework />}
      {tab === 'packages'      && <tabs.Packages />}
      {tab === 'earnings'      && <tabs.Earnings />}
      {tab === 'resources'     && <tabs.Resources />}
      {tab === 'reviews'       && <tabs.Reviews />}
      {tab === 'profile'       && <tabs.Profile />}
      {tab === 'verification'  && <tabs.Verification />}
      {tab === 'settings'      && <tabs.Settings />}
    </div>
  );
}
```
Har `tabs.X` `features/mind/counsellor/tabs/X.tsx` — 400 line se chhoti file, ek tab ek zimmedaari.

---

## 2. Onboarding gate (`VerificationPendingScreen`)

Counsellor login kar sakta hai (file 05 §2.2) par jab tak `verificationStatus !== 'approved'`, sirf ye screen aur `profile`/`verification` tab enabled hain, baaki sab disabled/blur ke saath "Verification ke baad unlock hoga":
```
"Aapki application review me hai"
Submitted: <date>
Documents: License ✓, ID ✓, Certificates ✓
[Edit application]   [Support se contact karein]
```
Rejected ho to reason dikhe + "Dobara submit karein" button (`Verification` tab kholta hai edit mode me).

---

## 3. Tab: Overview

Dashboard summary (glance-level, LawyerDashboard ke overview jaisa layout):
```
┌───────────────┬───────────────┬───────────────┬───────────────┐
│ Today sessions│ Pending req.  │ Active clients│ This month     │
│     3          │      2         │      12        │ ₹18,400        │
└───────────────┴───────────────┴───────────────┴───────────────┘
[Availability toggle: Online/Offline — bookable ya nahi, ek click]
Next session card (join button agar time aa gaya)
Recent requests (3 latest, "View all" -> Requests tab)
Quick stats chart: last 30 din sessions (bar)
Rating summary (avg + last 5 review snippets)
```

---

## 4. Tab: Requests

- Naye booking jo `autoConfirm = false` provider ke liye Pending state me hain.
- Card: patient (ya alias), concern, proposed time, mode, "First session" ya "Return client" badge, [Confirm] [Decline].
- Decline par reason mandatory (file 06 §6), turant 3 alternate slot suggest hoti hai patient ko (system handles).
- 12-hour countdown badge (auto-decline timer, file 06 §6 wala job).
- Empty state: "Koi pending request nahi. Naya booking aane par yahan dikhega."

---

## 5. Tab: Sessions

Sub-filter chips: **Upcoming | Today | Completed | Cancelled | No-show**.
- List/table: date-time, client, mode, duration, status badge, [Join] (agar window me) / [View notes] (completed) / [Reschedule offer].
- Row click -> side panel: client basic info (relationship-gated, file 05 §5), intake summary, past session count, "View notes" (apne notes), "Add note" quick link.
- Bulk nahi, ek-ek session manage hoti hai (mental health me bulk actions risky hain).

---

## 6. Tab: Schedule

- `CounsellorProfile.weeklyAvailability` edit: din-wise start/end + breaks (drag ya form, existing Doctor schedule editor `DoctorScheduleEdit.tsx` ka UI pattern reuse karna, wahi component structure hai jo already accessible/tested hai).
- `bufferMin`, `minNoticeHours`, `maxAdvanceDays` sliders/inputs.
- `unavailableDates` — calendar par click karke leave mark karo (multi-select date picker).
- "Sync with FindMedi calendar" — agar counsellor doctor bhi hai future me (edge case, abhi skip).
- Preview panel: "Is hafte aapke X slots available hain" (live `getSlots` call se sanity check).

---

## 7. Tab: Clients

- List: naam/alias, last session date, total sessions, active package (agar hai), risk flag badge (agar koi open `CrisisEvent` hai us client ke liye).
- **Sirf `hasRelationship` wale clients** dikhte hain (file 05 §5 policy — provider ko sirf apne clients).
- Search/filter: naam, concern tag, package status.
- Click -> `ClientDetail.tsx`: intake summary (encrypted fields decrypt on-demand), consent status, session history, shared journal entries (agar patient ne share kiya), shared mood/assessment (agar shared), homework history, "Add note", "Assign homework", "View safety plan" (agar shared).
- Anonymous client: naam ki jagah alias, "Reveal identity" button sirf crisis break-glass ke through (file 05 §7), normal browsing me kabhi nahi.

---

## 8. Tab: Notes

- Saari apni likhi notes ek jagah, client-wise group, search by client/date/risk-level.
- Read-only list yahan (edit sirf session room ke andar, file 07 §4) — is tab ka kaam sirf review/reference hai.
- Risk-level "moderate"/"high" wali notes upar highlight (red/amber left-border), quick "View crisis status" link agar `CrisisEvent` open hai.

---

## 9. Tab: Homework

- Assigned homework ki list (sabhi clients ke across), status filter (Assigned/In progress/Completed/Skipped).
- "Assign new" -> client select, template se ya custom (title, instructions, type, resource link, due date).
- Template library: common exercises (breathing, thought record, gratitude journal) — `MindResource` se linked, ek click assign.
- Completed homework ka `patientNote` yahan dikhe (agar patient ne likha).

---

## 10. Tab: Packages

- Provider ke khud ke `customPackages` (file 04 §3.1) manage: naam, sessionCount, duration, cadence, price, "Best for" tags, active/inactive toggle.
- Default plan (`supportPlanPrices`) bhi yahi se edit.
- Live packages jo clients ne khareede: list with usage (`sessionsUsed/sessionsTotal`), expiry, status — read-only yahan, refund sirf admin/patient request se hota hai (file 06 §7.4), provider sirf dekh sakta hai.

---

## 11. Tab: Earnings

- Existing lawyer/doctor earnings tab ka UI pattern reuse.
- Summary cards: This month, Pending payout, Lifetime.
- Table: session-wise (date, client, amount, platform commission %, provider share, payout status).
- "Withdraw" button (existing `withdraw-demo` jaisa pattern, file 06 §9).
- Package purchases bhi yahan line-item (poora package amount ek baar, ya per-session jaise complete ho — policy decide karni hai: **suggestion: package ka pura commission-adjusted amount purchase ke waqt hi "earned (locked)" dikhaye, session complete hone par "payable" ban jaye** — isse provider ko transparency milti hai ki package bik gaya hai).

---

## 12. Tab: Resources

- `MindResource` jo provider ne khud upload/curate kiya (apne clients ko recommend karne ke liye).
- "Add resource": title, type (article/video/audio/pdf), URL ya upload, tags.
- Platform-wide resources (admin curated) bhi dikhein, read-only, "Recommend to client" button (homework assign se link).

---

## 13. Tab: Reviews

- Existing `Review` component pattern reuse, `providerType: 'counsellor'` filter.
- Rating breakdown (professionalism, helpfulness, communication) bar chart.
- Anonymous reviews me reviewer naam nahi (patient ne anonymous session liya tha to review bhi anonymous rahegi).
- "Report review" (agar abusive/fake lage) -> admin moderation queue (file 11).

---

## 14. Tab: Profile

`CounsellorProfile` ka poora edit form — photo, bio, qualifications, specializations, approaches, languages, city, consultation modes, pricing. Save par agar koi "verification-sensitive" field badle (license number, qualifications) to `verificationStatus` **automatically pending me wapas nahi jata** — sirf flag `profileChangedSinceVerification: true` set hota hai, admin ko ek badge dikhta hai review ke liye, par provider turant discovery se hata nahi diya jata (business continuity). License document hi badle to hi re-verification zaroori (alag "Update license" flow, wahi turant pending karta hai).

---

## 15. Tab: Verification

- Documents (license, ID, certificates) upload/view, status badge.
- Timeline: submitted -> under review -> approved/rejected (with reason).
- Re-submit button agar rejected.

---

## 16. Tab: Settings

- Acceptance settings: `acceptsAnonymous`, `crisisOnCall`, `bookingEnabled` (vacation mode — turant discovery se hat jaye).
- Notification preferences (naya request, message, review — kaunsa email/push chahiye).
- Payout details (UPI/bank, encrypted).
- 2FA (file 05 §3 — provider ke liye suggested/mandatory).
- Danger zone: "Deactivate account" (soft, admin ko notify, data retain hota hai retention policy ke hisaab se, file 04 §4).

---

## 17. Counsellor-specific components (naye)

| Component | Kaam |
|---|---|
| `CounsellorTabBar.tsx` | 14 tabs ka horizontal scrollable bar, badge counts (pending requests, unread) |
| `VerificationPendingScreen.tsx` | Gate screen |
| `ClientRiskBadge.tsx` | Chhota badge jo `CrisisEvent.status='open'` hone par dikhta hai client row par |
| `AssignHomeworkModal.tsx` | Homework create form |
| `PackageEditor.tsx` | Custom package CRUD form |

---

## 18. API hooks (`features/mind/api/provider.ts`)

```ts
export const useCounsellorProfile = () => useQuery({ queryKey: ['mind','counsellor','me'], queryFn: () => client.get('/provider/me').then(r => r.data) });
export const useUpdateProfile = () => useMutation({ mutationFn: (body) => client.patch('/provider/me', body) });
export const useMyRequests = () => useQuery({ queryKey: ['mind','provider','requests'], queryFn: () => client.get('/bookings/my?role=provider&status=Pending').then(r => r.data) });
export const useConfirmBooking = () => useMutation({ mutationFn: (id) => client.post(`/bookings/${id}/confirm`) });
export const useDeclineBooking = () => useMutation({ mutationFn: ({id, reason}) => client.post(`/bookings/${id}/decline`, { reason }) });
export const useMyClients = () => useQuery({ queryKey: ['mind','provider','clients'], queryFn: () => client.get('/provider/clients').then(r => r.data) });
```
Backend `GET /api/mind/provider/clients`: `hasRelationship` policy se filter, response me sirf metadata + latest summary (poora clinical data client detail par lazy-load).

---

## 19. Permission reminder (file 05 se link)

Har tab ka data policy se guzarta hai — sabse zaroori: **Clients tab me sirf active-relationship wale dikhein**, Notes tab me sirf apni likhi notes, Earnings me sirf apni. Ye baar-baar likhne ki zaroorat nahi — file 05 ka `canViewClientData`/`hasRelationship` already sab jagah middleware me hai, frontend sirf usi API ka response trust karta hai.

## 20. Test checklist

| # | Check |
|---|---|
| 1 | Tab URL me `?tab=requests` — refresh karne par wahi tab khula rahe (bug fix vs LawyerDashboard) |
| 2 | Pending verification counsellor sirf Profile/Verification dekh paye |
| 3 | Relationship na hone par client kisi list me na aaye |
| 4 | Vacation mode ON karte hi discovery se turant hat jaye |
| 5 | Risk-level high note save hote hi Clients tab me badge turant (socket push) dikhe |

# 10 — Psychiatrist Dashboard (Doctor Dashboard + Mental-Health Extra Tools)

**Zaroori structural fark jo repo padh ke pata chala:** Counsellor/Lawyer dashboard **ek single page hai jisme tabs hain** (`?tab=` query param, andar sab kuch same component tree me). Lekin **Doctor dashboard aisa nahi hai** — `DoctorDashboard.tsx` sirf ek overview/widget page hai, aur baaki sab (`DoctorSchedule.tsx`, `DoctorPatients.tsx`, `DoctorPrescriptions.tsx`, `DoctorEarnings.tsx`, `DoctorReviews.tsx`, `DoctorProfile.tsx`) **alag-alag routes/pages hain**, sidebar se directly navigate hote hain (`navConfig.doctor` me 25+ separate `path` entries).

Isliye psychiatrist ke liye "counsellor jaisa tab dashboard" **nahi** banega. Iske bajaye: **existing doctor multi-page structure ke andar hi naye mental-health-specific pages add honge**, jo tab `isMentalHealthProvider = true` ho tabhi sidebar me dikhein. File 01 me jo likha tha ("PsychiatristDashboard.jsx delete, psychiatrist = doctor dashboard + extra tools") wahi sahi hai — is file me exact shape hai.

---

## 1. Kaise pata chale doctor psychiatrist hai

`Doctor.mentalHealth.isMentalHealthProvider === true` (file 04 §2.2). Login ke baad `useAuth()`/`useDoctorProfile()` se ye flag milta hai, uske hisaab se:
1. Sidebar me extra items dikhte hain (section 2).
2. `DoctorDashboard.tsx` (overview) me ek extra summary card add hota hai.
3. `DoctorAppointments.tsx` me `serviceLine: 'mental_health'` wali appointments ko chhota "Mind" badge milta hai taaki medical aur mental-health appointments ek hi list me easily distinguish ho jayein (list **merge** rehti hai, split nahi — file 00 ka decision tha "psychiatrist naya role nahi", to appointments bhi ek hi jagah).

---

## 2. Sidebar (AppSidebar.tsx, `doctor` array me conditional items)

`navConfig.doctor` static array hai (object, function nahi), isliye conditional items ke liye `SidebarContent` render time par filter karna padega:
```jsx
const rawItems = navConfig[user?.role] || navConfig.patient;
const navItems = rawItems.filter(item =>
  !item.mentalHealthOnly || user?.doctorProfile?.mentalHealth?.isMentalHealthProvider
);
```
Naye items array me add (`isMentalHealthOnly: true` flag ke saath, `isMind: true` grouping bhi, "My Health" jaise pattern se):
```js
{ icon: Brain, labelKey: 'nav.mindClients', path: '/doctor/mind/clients', mentalHealthOnly: true, isMind: true },
{ icon: Pill,  labelKey: 'nav.medicationReview', path: '/doctor/mind/medication-review', mentalHealthOnly: true, isMind: true },
{ icon: ClipboardList, labelKey: 'nav.riskFlags', path: '/doctor/mind/risk-flags', mentalHealthOnly: true, isMind: true },
{ icon: FileText, labelKey: 'nav.treatmentPlans', path: '/doctor/mind/treatment-plans', mentalHealthOnly: true, isMind: true },
{ icon: ClipboardCheck, labelKey: 'nav.assessments', path: '/doctor/mind/assessments', mentalHealthOnly: true, isMind: true },
```
(Existing `nav.mentalHealth` item jo `hospital_admin` role me hai `/mentalhealth` — **wo alag hai**, file 07 §0 ka collision note yaad rakhna. Ye naye items `doctor` role ke andar hain, alag path `/doctor/mind/*`.)

Non-psychiatrist doctor ke liye ye items bilkul nahi dikhte — sidebar clutter nahi badhta.

---

## 3. Doctor onboarding me toggle (admin side, file 05 §2.3, file 11 me detail)

Admin ke doctor-verification screen me ek naya section "Mental Health Provider":
```
[ ] Ye doctor mental-health services deta hai
    Provider kind: ( ) Psychiatrist  ( ) Clinical Psychologist
    NMC/registration verify: [_____________] [Verify]
    Concerns: [multi-select chips]
    Prescribes medication: [x]
```
Save par `Doctor.mentalHealth.isMentalHealthProvider = true` set, doctor ko notification: "Aap ab Mind & Wellness discovery me Psychiatrists ke taur par dikhenge."

---

## 4. `DoctorDashboard.tsx` (overview) me extra card

Existing overview widgets (appointments today, earnings, mode-meta cards) ke saath, agar `isMentalHealthProvider`, ek extra card:
```
┌─────────────────────────────────────┐
│ Mind & Wellness                      │
│ Active clients: 14   Today: 2 sessions│
│ Pending medication reviews: 3         │
│ [Go to Mind clients →]                │
└─────────────────────────────────────┘
```
Existing layout ko todna nahi, bas ek aur card grid me add hoti hai (existing `EarningsAnalytics` component jaisi jagah).

---

## 5. `/doctor/mind/clients` — Client list (Mental-health filtered patients)

`DoctorPatients.tsx` (existing) me **sabhi** patients dikhte hain (medical + mental health mix). `/doctor/mind/clients` isi component ko **reuse** karta hai ek prop ke saath: `<DoctorPatients filterServiceLine="mental_health" />` — naya component nahi likhna, existing ko parametrize karna (DRY, file 02 ka principle #2 "reuse over rewrite").

Row me extra: risk badge (open `CrisisEvent` hai to), active `TreatmentPlan` status, last assessment score/severity chip.

---

## 6. `/doctor/mind/medication-review` — `MedicationReview.tsx`

Psychiatrist-specific, counsellor ke paas ye tab hai hi nahi (file 05 permission matrix: "Prescription — counsellor: `-`").

```
List: client, current medications (from latest Prescription), last reviewed date, "Review due" badge (PsychRxMeta.medicationReviewDue < today)
Click -> Review panel:
  - Current medications (dose, frequency) — existing Prescription data se
  - Side effects reported (patient se, agar `MoodEntry`/`JournalEntry` me tag kiya ho, ya ek chhota "Side effects check" form patient ko bhejo)
  - [Continue as-is] [Adjust dose] [Add medication] [Discontinue] -> naya Prescription create (existing flow)
  - Next review date set -> PsychRxMeta.medicationReviewDue update
  - Monitoring tests due (PsychRxMeta.monitoring[], jaise "Lithium levels — due 15 Oct")
```
Naya `Prescription` **FindMedi ke existing model** me hi jata hai (file 04 §3.6), taaki patient ki "My Prescriptions", pharmacy order, Medicine Reminders sab automatically kaam karein — koi alag prescription system nahi.

---

## 7. `/doctor/mind/risk-flags` — `RiskFlags.tsx`

Sirf apne assigned `CrisisEvent`s (file 05 permission: "Crisis events — psychiatrist: assigned").
```
Open | Acknowledged | Resolved tabs
Card: client (alias/naam), source (chat/assessment/journal/sos), severity, time since raised
[Acknowledge] -> status change, timer start
[View context] -> minimal snippet (excerptHash ka readable version agar provider ne khud flag kiya, warna generic "high-risk answer on assessment")
[Resolve] -> notes mandatory, closes event
[Escalate to admin] -> admin crisis monitor me bhi turant dikhe (file 11, file 12)
```
Ye tab crisis flow (file 12) ka provider-side UI hai, poora logic wahan hai.

---

## 8. `/doctor/mind/treatment-plans` — `TreatmentPlanEditor.tsx`

```
Client select -> current plan (goals[], interventions[], reviewEveryDays, nextReviewAt, status)
Editable: goals add/remove, interventions add/remove, review cadence
History: purane versions read-only (simple version array ya updatedAt log)
"Link to counsellor" (agar client counsellor ke saath bhi hai — shared care coordination, optional field `coCounsellorId`)
```
`ChronicCarePlan` model already exist karta hai FindMedi me (diabetes/BP jaisi conditions ke liye) — agar uska structure fit baithta hai to **extend karo, naya model mat banao** (file 04 §3.6 me "ya ChronicCarePlan extend" likha tha, final call: agar `ChronicCarePlan.condition` enum me `'mental_health'` add karna kaam kar jaye to wahi use karo, warna alag `TreatmentPlan` model — jo bhi kam duplication kare).

---

## 9. `/doctor/mind/assessments` — `Assessments.tsx`

```
Client-wise assessment history: PHQ-9, GAD-7, etc, score trend chart (recharts, jaisa patient ke Wellness me mini-version tha)
"Assign new assessment" -> client ko notification, patient side Wellness tab me fill karna hota hai
Item-9 flag wale highlighted (red badge)
```

---

## 10. Booking wizard me farak (file 06 se link, dohrana nahi)

Psychiatrist ke liye service types `first_consultation`, `follow_up`, `medication_review` (file 06 §11) already defined hain, booking wizard automatically inhi options dikhata hai jab provider `kind === 'psychiatrist'`. Koi naya booking code nahi, wahi engine.

---

## 11. Farak table (counsellor vs psychiatrist, final)

| Cheez | Counsellor | Psychiatrist |
|---|---|---|
| Dashboard shape | Single page, tabs (`?tab=`) | Multi-page (existing doctor pages + naye mind pages) |
| Naya role? | Haan, `counsellor` | Nahi, `doctor` + flag |
| Prescription | Nahi likh sakta | Likh sakta hai (existing `Prescription` model) |
| Medication review | Nahi | Haan |
| Treatment plan | Read-only (agar shared) | Likh/edit sakta hai |
| Client list | `hasRelationship` filtered, sabhi mind clients | `hasRelationship` filtered, sirf `serviceLine:'mental_health'` filter existing patient list par |
| Crisis assigned events | Haan | Haan |
| Earnings | Naya `earnings` tab (file 09 §11) | Existing `DoctorEarnings.tsx` (mind sessions bhi usi me line-item, `serviceType: mind_session` filter se) |

---

## 12. Kya reuse ho raha hai (explicit list, file 02 principle #2 follow karte hue)

| Naya kaam | Existing se reuse |
|---|---|
| Client list | `DoctorPatients.tsx` (prop se filter) |
| Prescription | `Prescription` model + existing `DoctorPrescriptions.tsx`/`PatientPrescriptions.tsx` |
| Earnings | `DoctorEarnings.tsx` + `EarningsAnalytics` component |
| Schedule | Existing `DoctorSchedule.tsx`/`DoctorScheduleEdit.tsx` (slot engine adapter file 06 §5.1 already isko wrap karta hai) |
| Video/audio call | `VideoCallContext`, `AudioCallContext`, `DoctorVideoCallRoom.tsx` (file 07 §3) |
| Reviews | Existing `DoctorReviews.tsx` |
| Chronic care | `ChronicCarePlan` model (extend, agar fit ho) |

Naya sirf: medication-review UI (ek dhang ka focused review flow jo abhi doctor ke paas nahi hai), risk-flags UI, treatment-plan editor, assessment history view — ye 4 hi genuinely naye pages hain.

## 13. Test checklist

| # | Check |
|---|---|
| 1 | Non-mental-health doctor login kare — koi mind item sidebar me na dikhe |
| 2 | Admin flag ON kare — doctor turant discovery me psychiatrist ki tarah dikhe (cache/stale data na ho) |
| 3 | `DoctorPatients.tsx` filtered view sirf mental_health serviceLine wale dikhaye, medical patients na aayein |
| 4 | Counsellor ko `/doctor/mind/medication-review` jaisa koi permission na mile (role check, 403) |
| 5 | Prescription likhne ke baad patient ki normal "My Prescriptions" me turant dikhe |


# 11 — Admin Console (Onboarding, Verification, Payouts, Moderation)

**Repo me abhi:** `navConfig.superadmin` me already `nav.saModeration` (`/superadmin/moderation`), `nav.saDisputes`, `nav.saRevenue`, `nav.saLicenses`, `nav.saAudit`, `nav.legalServices` (`/admin/lawyers`) jaise items hain — lawyer approval ka apna admin page pehle se hai. Counsellor approval **isi pattern se** banega: `nav.mindProviders` (`/admin/mind/providers`), lawyer ke jaisa hi ek naya sidebar item `superadmin` array me.

Mind ka purana `AdminDashboard.jsx` (2866 lines, tabs: overview, users, counsellors, applications, revenue, refunds, emergency, reports, analytics, exports, security) **delete** hota hai; iske functions superadmin ke existing admin area ke andar chhote pages ban jate hain — ek alag "mind admin app" nahi banta (file 00 ka goal #7: "ek dikhne wala product").

---

## 1. Sidebar addition (`navConfig.superadmin`)

```js
{ icon: Brain,       labelKey: 'nav.mindProviders',  path: '/admin/mind/providers' },
{ icon: AlertTriangle, labelKey: 'nav.mindCrisis',   path: '/admin/mind/crisis' },
{ icon: Package,     labelKey: 'nav.mindPackages',   path: '/admin/mind/packages' },
{ icon: DollarSign,  labelKey: 'nav.mindPayouts',    path: '/admin/mind/payouts' },
{ icon: Flag,        labelKey: 'nav.mindModeration', path: '/admin/mind/moderation' },
{ icon: BarChart3,   labelKey: 'nav.mindAnalytics',  path: '/admin/mind/analytics' },
```
6 naye items, existing `nav.saModeration` (general moderation) alag rehta hai — ye specifically mind ke liye hain, jaisa `nav.legalServices` lawyer ke liye alag hai.

---

## 2. `/admin/mind/providers` — Onboarding + Verification

Do sub-tabs: **Counsellors | Psychiatrists**.

### 2.1 Counsellors
```
Filter: Pending | Approved | Rejected | Suspended
Table: naam, type (professional/mentor), submitted date, documents (view links), [Approve] [Reject] [View full application]
```
Row expand -> poora `CounsellorProfile` application: personal, professional (qualifications, license number + doc), practice (pricing, availability), agreements checklist. `[Approve]` par:
```js
await CounsellorProfile.updateOne({ _id }, { verificationStatus: 'approved', verifiedAt: new Date(), verifiedBy: adminId });
await User.updateOne({ _id: userId }, { approvalStatus: 'approved' });
await notify.counsellorApproved(userId);
```
`[Reject]` -> reason mandatory textarea, notification with reason, re-submit allowed.

### 2.2 Psychiatrists
Existing doctor verification flow ke andar hi ek extra tab/section: "Mental Health" toggle (file 10 §3) — alag list nahi, doctor verification screen ka ek section hai. Yahan sirf ek **filtered view**: "Doctors jinhone `isMentalHealthProvider` request kiya hai" quick access ke liye.

---

## 3. `/admin/mind/crisis` — Crisis Monitor

```
Open | Acknowledged | Resolved tabs
Table: user (identity chhupi rahe jab tak break-glass na ho), source, severity, assigned provider, time since raised, SLA timer (red agar 15 min se zyada open)
[Assign] (agar koi provider assigned nahi, jaise `crisisOnCall` wala nahi mila)
[View audit trail] (kisne kab dekha)
```
Admin ko **content kabhi nahi dikhta** (file 05 §4, rule 3) — sirf metadata, status, assign/escalate actions. Break-glass reveal identity sirf khud provider/admin crisis ke doran, alag audited action (file 05 §7), is list se directly nahi.
Monthly break-glass usage report yahin ek chhota widget: "Is mahine N baar identity reveal hui" + export.

---

## 4. `/admin/mind/packages` — Platform Packages

```
Default SupportPackage catalog (one_time/short/medium/long term): naam, sessionCount, defaultPrice, multiplier — edit/deactivate
Provider custom packages: read-only list (audit ke liye), flag karne ka option agar pricing suspicious lage
Refund requests queue: patient ne `POST /packages/:id/refund` maanga, admin approve/deny (refundService.packageRefund se calculated amount dikh raha ho, admin override kar sake reason ke saath)
```

---

## 5. `/admin/mind/payouts` — Provider Earnings/Payouts

```
Table: provider, pending payable, last payout date, [Mark paid] (manual, jab tak real gateway na ho — file 06 §9)
Filter: counsellor / psychiatrist
Export CSV (existing superadmin export pattern reuse, `nav.saExport`)
Commission override (per-provider `platformCommissionPct` edit — rare case, high-value provider negotiate kare to)
```

---

## 6. `/admin/mind/moderation` — Peer Support + Reviews

```
Tabs: Peer posts (reported) | Peer comments (reported) | Reviews (reported) | Provider complaints (ProviderReport)
Card: content preview, reporter, reason, [Hide] [Remove] [Dismiss] [Warn user] [Ban user from peer support]
```
Peer post/comment content **admin dekh sakta hai** (public community content hai, therapy note/journal jaisa private nahi) — file 05 permission matrix me "Peer posts — superadmin: moderate" explicit hai.

`ProviderReport` (client complaints against provider) alag sub-tab: complaint detail (patient se), [Contact provider] [Warn] [Suspend provider] [Dismiss].

---

## 7. `/admin/mind/analytics` — Aggregate Analytics

**Aggregate only** — koi individual patient data nahi (file 05 §4 rule: "Admin ko therapy note, journal, chat kabhi nahi dikhte").
```
Cards: Total sessions (this month), New patients, Active providers, Avg session rating, Revenue, Crisis events (count only)
Charts: Sessions trend (line), Revenue by provider type (bar), Concern-type breakdown (pie/bar), Booking-to-completion funnel
Cohort: Package renewal rate, no-show rate, cancellation rate
```
Ye sab `AuditLog`/`Appointment`/`Payment` aggregation queries se banega, PHI (concern text, notes) kabhi query me raw text nahi laata — sirf enum/category counts.

---

## 8. Verification screen me doctor ka mental-health toggle (file 10 se link)

Existing doctor-verification admin page (`/admin/doctors` ke andar doctor detail) me ek naya collapsible section:
```
Mental Health Provider
[ ] Enable as mental-health provider
    Provider kind: dropdown
    Verify NMC/MD Psychiatry: [file link] [Mark verified]
    Concerns/approaches: multi-select
[Save]
```
Yahi se `Doctor.mentalHealth.isMentalHealthProvider = true` set hota hai (file 10 §3 me consume hota hai).

---

## 9. Admin permissions recap (file 05 se, yahan sirf UI-level enforcement)

- Admin routes `restrictTo('superadmin')` (file 02 §4, `admin.routes.js` comment).
- Koi bhi admin page kabhi session note/journal/chat text render na kare — component-level bhi double-check (defense in depth, sirf backend policy par depend na karo).
- Saari admin actions `AuditLog` me (`mind.provider.verify`, `mind.package.refund`, `mind.crisis.ack/resolve` — file 05 §11 ki list).

---

## 10. Naye backend routes (summary, file 14 me implementation)

| Method | Path | Kaam |
|---|---|---|
| GET | `/api/mind/admin/providers?type=&status=` | Counsellor applications list |
| POST | `/api/mind/admin/providers/:id/approve` | Approve |
| POST | `/api/mind/admin/providers/:id/reject` | Reject + reason |
| GET | `/api/mind/admin/crisis?status=` | Crisis events |
| POST | `/api/mind/admin/crisis/:id/assign` | Assign provider |
| GET | `/api/mind/admin/packages` | Catalog + custom packages |
| PATCH | `/api/mind/admin/packages/:id` | Edit default package |
| GET | `/api/mind/admin/payouts` | Payout list |
| POST | `/api/mind/admin/payouts/:id/mark-paid` | Manual payout mark |
| GET | `/api/mind/admin/moderation/peer` | Reported peer content |
| POST | `/api/mind/admin/moderation/peer/:id/action` | Hide/remove/dismiss |
| GET | `/api/mind/admin/analytics` | Aggregate stats |

Sab `router.use(protect, restrictTo('superadmin'))` ke peeche (file 02 §4 pattern).

## 11. Test checklist

| # | Check |
|---|---|
| 1 | Admin ko kisi bhi client ki journal/note kabhi na dikhe, koi API bhi text return na kare |
| 2 | Approve karte hi provider discovery me turant dikhe (cache invalidate) |
| 3 | Crisis list me sirf metadata, koi PHI text nahi |
| 4 | Refund approve/deny dono `refundService` se consistent amount dikhaye |
| 5 | Har admin action AuditLog me record ho |

# 11 — Admin Console (Onboarding, Verification, Payouts, Moderation)

**Repo me abhi:** `navConfig.superadmin` me already `nav.saModeration` (`/superadmin/moderation`), `nav.saDisputes`, `nav.saRevenue`, `nav.saLicenses`, `nav.saAudit`, `nav.legalServices` (`/admin/lawyers`) jaise items hain — lawyer approval ka apna admin page pehle se hai. Counsellor approval **isi pattern se** banega: `nav.mindProviders` (`/admin/mind/providers`), lawyer ke jaisa hi ek naya sidebar item `superadmin` array me.

Mind ka purana `AdminDashboard.jsx` (2866 lines, tabs: overview, users, counsellors, applications, revenue, refunds, emergency, reports, analytics, exports, security) **delete** hota hai; iske functions superadmin ke existing admin area ke andar chhote pages ban jate hain — ek alag "mind admin app" nahi banta (file 00 ka goal #7: "ek dikhne wala product").

---

## 1. Sidebar addition (`navConfig.superadmin`)

```js
{ icon: Brain,       labelKey: 'nav.mindProviders',  path: '/admin/mind/providers' },
{ icon: AlertTriangle, labelKey: 'nav.mindCrisis',   path: '/admin/mind/crisis' },
{ icon: Package,     labelKey: 'nav.mindPackages',   path: '/admin/mind/packages' },
{ icon: DollarSign,  labelKey: 'nav.mindPayouts',    path: '/admin/mind/payouts' },
{ icon: Flag,        labelKey: 'nav.mindModeration', path: '/admin/mind/moderation' },
{ icon: BarChart3,   labelKey: 'nav.mindAnalytics',  path: '/admin/mind/analytics' },
```
6 naye items, existing `nav.saModeration` (general moderation) alag rehta hai — ye specifically mind ke liye hain, jaisa `nav.legalServices` lawyer ke liye alag hai.

---

## 2. `/admin/mind/providers` — Onboarding + Verification

Do sub-tabs: **Counsellors | Psychiatrists**.

### 2.1 Counsellors
```
Filter: Pending | Approved | Rejected | Suspended
Table: naam, type (professional/mentor), submitted date, documents (view links), [Approve] [Reject] [View full application]
```
Row expand -> poora `CounsellorProfile` application: personal, professional (qualifications, license number + doc), practice (pricing, availability), agreements checklist. `[Approve]` par:
```js
await CounsellorProfile.updateOne({ _id }, { verificationStatus: 'approved', verifiedAt: new Date(), verifiedBy: adminId });
await User.updateOne({ _id: userId }, { approvalStatus: 'approved' });
await notify.counsellorApproved(userId);
```
`[Reject]` -> reason mandatory textarea, notification with reason, re-submit allowed.

### 2.2 Psychiatrists
Existing doctor verification flow ke andar hi ek extra tab/section: "Mental Health" toggle (file 10 §3) — alag list nahi, doctor verification screen ka ek section hai. Yahan sirf ek **filtered view**: "Doctors jinhone `isMentalHealthProvider` request kiya hai" quick access ke liye.

---

## 3. `/admin/mind/crisis` — Crisis Monitor

```
Open | Acknowledged | Resolved tabs
Table: user (identity chhupi rahe jab tak break-glass na ho), source, severity, assigned provider, time since raised, SLA timer (red agar 15 min se zyada open)
[Assign] (agar koi provider assigned nahi, jaise `crisisOnCall` wala nahi mila)
[View audit trail] (kisne kab dekha)
```
Admin ko **content kabhi nahi dikhta** (file 05 §4, rule 3) — sirf metadata, status, assign/escalate actions. Break-glass reveal identity sirf khud provider/admin crisis ke doran, alag audited action (file 05 §7), is list se directly nahi.
Monthly break-glass usage report yahin ek chhota widget: "Is mahine N baar identity reveal hui" + export.

---

## 4. `/admin/mind/packages` — Platform Packages

```
Default SupportPackage catalog (one_time/short/medium/long term): naam, sessionCount, defaultPrice, multiplier — edit/deactivate
Provider custom packages: read-only list (audit ke liye), flag karne ka option agar pricing suspicious lage
Refund requests queue: patient ne `POST /packages/:id/refund` maanga, admin approve/deny (refundService.packageRefund se calculated amount dikh raha ho, admin override kar sake reason ke saath)
```

---

## 5. `/admin/mind/payouts` — Provider Earnings/Payouts

```
Table: provider, pending payable, last payout date, [Mark paid] (manual, jab tak real gateway na ho — file 06 §9)
Filter: counsellor / psychiatrist
Export CSV (existing superadmin export pattern reuse, `nav.saExport`)
Commission override (per-provider `platformCommissionPct` edit — rare case, high-value provider negotiate kare to)
```

---

## 6. `/admin/mind/moderation` — Peer Support + Reviews

```
Tabs: Peer posts (reported) | Peer comments (reported) | Reviews (reported) | Provider complaints (ProviderReport)
Card: content preview, reporter, reason, [Hide] [Remove] [Dismiss] [Warn user] [Ban user from peer support]
```
Peer post/comment content **admin dekh sakta hai** (public community content hai, therapy note/journal jaisa private nahi) — file 05 permission matrix me "Peer posts — superadmin: moderate" explicit hai.

`ProviderReport` (client complaints against provider) alag sub-tab: complaint detail (patient se), [Contact provider] [Warn] [Suspend provider] [Dismiss].

---

## 7. `/admin/mind/analytics` — Aggregate Analytics

**Aggregate only** — koi individual patient data nahi (file 05 §4 rule: "Admin ko therapy note, journal, chat kabhi nahi dikhte").
```
Cards: Total sessions (this month), New patients, Active providers, Avg session rating, Revenue, Crisis events (count only)
Charts: Sessions trend (line), Revenue by provider type (bar), Concern-type breakdown (pie/bar), Booking-to-completion funnel
Cohort: Package renewal rate, no-show rate, cancellation rate
```
Ye sab `AuditLog`/`Appointment`/`Payment` aggregation queries se banega, PHI (concern text, notes) kabhi query me raw text nahi laata — sirf enum/category counts.

---

## 8. Verification screen me doctor ka mental-health toggle (file 10 se link)

Existing doctor-verification admin page (`/admin/doctors` ke andar doctor detail) me ek naya collapsible section:
```
Mental Health Provider
[ ] Enable as mental-health provider
    Provider kind: dropdown
    Verify NMC/MD Psychiatry: [file link] [Mark verified]
    Concerns/approaches: multi-select
[Save]
```
Yahi se `Doctor.mentalHealth.isMentalHealthProvider = true` set hota hai (file 10 §3 me consume hota hai).

---

## 9. Admin permissions recap (file 05 se, yahan sirf UI-level enforcement)

- Admin routes `restrictTo('superadmin')` (file 02 §4, `admin.routes.js` comment).
- Koi bhi admin page kabhi session note/journal/chat text render na kare — component-level bhi double-check (defense in depth, sirf backend policy par depend na karo).
- Saari admin actions `AuditLog` me (`mind.provider.verify`, `mind.package.refund`, `mind.crisis.ack/resolve` — file 05 §11 ki list).

---

## 10. Naye backend routes (summary, file 14 me implementation)

| Method | Path | Kaam |
|---|---|---|
| GET | `/api/mind/admin/providers?type=&status=` | Counsellor applications list |
| POST | `/api/mind/admin/providers/:id/approve` | Approve |
| POST | `/api/mind/admin/providers/:id/reject` | Reject + reason |
| GET | `/api/mind/admin/crisis?status=` | Crisis events |
| POST | `/api/mind/admin/crisis/:id/assign` | Assign provider |
| GET | `/api/mind/admin/packages` | Catalog + custom packages |
| PATCH | `/api/mind/admin/packages/:id` | Edit default package |
| GET | `/api/mind/admin/payouts` | Payout list |
| POST | `/api/mind/admin/payouts/:id/mark-paid` | Manual payout mark |
| GET | `/api/mind/admin/moderation/peer` | Reported peer content |
| POST | `/api/mind/admin/moderation/peer/:id/action` | Hide/remove/dismiss |
| GET | `/api/mind/admin/analytics` | Aggregate stats |

Sab `router.use(protect, restrictTo('superadmin'))` ke peeche (file 02 §4 pattern).

## 11. Test checklist

| # | Check |
|---|---|
| 1 | Admin ko kisi bhi client ki journal/note kabhi na dikhe, koi API bhi text return na kare |
| 2 | Approve karte hi provider discovery me turant dikhe (cache invalidate) |
| 3 | Crisis list me sirf metadata, koi PHI text nahi |
| 4 | Refund approve/deny dono `refundService` se consistent amount dikhaye |
| 5 | Har admin action AuditLog me record ho |
# 12 — Safety, Crisis Flow, Notifications, Reminders

Ye file wo sab jodti hai jo files 06-11 me "file 12 me hai" likh ke chhoda gaya tha: crisis detection se resolution tak, poora notification matrix, aur reminder/cron jobs.

---

## 1. Crisis kaise trigger hoti hai (sources)

| Source | Kahan se | Detection |
|---|---|---|
| `chat` | Session chat ya secure message | `crisisRegex` (mind me already tha, file 01 §12 "rakhne layak") keywords ke liye scan |
| `assessment` | PHQ-9 item-9 (khud ko nuksan) score > 0 | `Assessment.itemNineFlag` |
| `journal` | Patient ki journal entry | Same `crisisRegex`, sirf agar entry provider ke saath shared hai (unshared journal scan **nahi** hoti — privacy, file 05 §4) |
| `sos_button` | Patient khud "Turant madad chahiye" dabaye | Direct trigger, koi keyword detection nahi chahiye |
| `provider_flag` | Session note me `riskLevel: moderate/high` | File 07 §4.3 |

### 1.1 `crisisRegex` upgrade
Purana regex mind me simple tha. Naya version: keyword list + severity mapping, config me rakho (`mind.crisisKeywords`) taaki hardcode na ho aur baad me tune ho sake bina deploy ke. **Ye regex kabhi bhi frontend me expose nahi hota** (word list bhi sensitive-ish, gaming ho sakti hai) — sirf backend service.

```js
// crisisService.js
export async function scanText(text, { userId, source, appointmentId }) {
  const hit = matchCrisisPattern(text);           // regex/keyword match, internal
  if (!hit) return null;
  return raise({ userId, source, severity: hit.severity, appointmentId, excerpt: text });
}

export async function raise({ userId, source, severity, appointmentId, excerpt }) {
  const excerptHash = excerpt ? hashForAudit(excerpt) : null;      // raw text kabhi store nahi (file 04 §3.7)
  const event = await CrisisEvent.create({ userId, source, severity, excerptHash, status: 'open' });
  await assignOnCall(event);                                        // section 3
  await notify.crisisRaised(event);                                 // section 5
  return event;
}
```

---

## 2. SOS button (patient-facing)

- Har mind page ke header me ek chhota, hamesha-visible "Turant madad chahiye?" link/button (discreet mode me bhi visible rehta hai — safety kabhi hide nahi hoti, sirf branding generic hoti hai).
- Click par `HelplineSheet.tsx` khulta hai:
```
Tele-MANAS: 14416 (24x7, free) [Call now]
Emergency: 112 [Call now]
"Apne counsellor/psychiatrist ko turant alert karein" [button, agar active provider hai]
"Ye emergency service nahi hai" disclaimer (file 00 §8)
```
- "Alert karein" dabane se `crisisService.raise({ source: 'sos_button', severity: 'high' })` + us patient ka **assigned provider ko turant** notify (agar koi active relationship hai), warna direct admin/on-call.
- Helpline numbers **hardcode nahi**, `MIND_CRISIS_HELPLINES_JSON` env se (file 02 §6), taaki number badalne par deploy na karna pade. Release se pehle verify karna (file 00 §8 ka reminder yahin repeat).

---

## 3. Assignment (kaun respond karega)

```js
async function assignOnCall(event) {
  const patient = await User.findById(event.userId);
  const activeProvider = await findActiveProvider(event.userId);     // hasRelationship wala latest
  if (activeProvider && (await isProviderOnCall(activeProvider) || isWithinBusinessHours())) {
    event.assignedTo = activeProvider; await event.save();
    return;
  }
  const onCall = await findAnyOnCallProvider();                       // CounsellorProfile.crisisOnCall / Doctor.mentalHealth.crisisOnCall
  event.assignedTo = onCall?._id || null;                              // null ho to admin default assignee
  await event.save();
}
```
Koi bhi on-call na mile to seedha admin queue me (file 11 §3), kabhi khaali na chhode.

---

## 4. Escalation timers

| SLA | Action |
|---|---|
| 5 min me acknowledge nahi hua | Admin ko bhi turant notify (double-alert) |
| 15 min me acknowledge nahi hua | `CrisisEvent` list me red/urgent badge, admin dashboard top par pin |
| 24 ghante open rahe | Auto-escalate: assigned provider badal ke seedha admin, provider ko "missed" flag (internal, punitive nahi — training signal) |

Cron job (`reminders.job.js` family, section 8) har 5 minute check karta hai open events ka SLA.

---

## 5. Notification matrix (poora)

| Event | Kisko | Channel | Discreet mode me |
|---|---|---|---|
| `mind:booking_requested` | Provider | In-app + push | — (provider side discreet nahi) |
| `mind:booking_status` (confirm/decline/cancel) | Patient | In-app + push + email | Generic "Appointment update" |
| `mind:session_starting` (10 min pehle) | Dono | In-app + push | Generic "Appointment reminder" |
| `mind:session_joined` | Dusra participant | In-app (toast) | — |
| `mind:session_ended` | Dono | In-app | — |
| `mind:message` | Dusra participant | In-app + push (agar app band hai) | Generic "New message" |
| `mind:crisis_alert` | On-call provider + admin | In-app + push + **SMS-ready** (file 02 risk table) | Kabhi generic nahi — provider/admin ko poori detail chahiye |
| `mind:homework_assigned` | Patient | In-app | Generic "New task" |
| `mind:homework_completed` | Provider | In-app | — |
| `mind:package_low` | Patient | In-app + email | Generic "Package update" |
| Reminder 24h/1h/10min | Patient + provider | In-app + push + email (24h) | Generic subject/body |
| Provider verification approved/rejected | Provider | In-app + email | — |
| Package expiring soon | Patient | In-app + email | Generic |
| Follow-up due | Patient | In-app + email | Generic |

Implementation: existing `Notification` model + `NotificationContext` (file 08 §6), `type` field se filter/icon decide hota hai frontend me. Email/SMS abstraction layer (`notifyChannel.js`) — SMS abhi **interface only** hai (file 02 risk table: "Web push nahi to reminders miss — SMS-ready abstraction"), real provider (Twilio/MSG91) baad me plug ho sakta hai bina baaki code badle.

---

## 6. Discreet notification serializer

```js
function toDiscreet(payload, user) {
  if (!user.mindSettings?.discreetNotifications) return payload;
  const safe = { ...payload, title: 'FindMedi', body: 'Aapke account me ek update hai.' };
  return safe;                              // crisis alerts is function se guzarte hi nahi (upar table dekho)
}
```

---

## 7. Quick exit (recap, file 05 §9 se implementation)

```jsx
// components/QuickExitButton.tsx — mind ke har layout ke header me fixed
<button onClick={() => { window.location.replace('https://www.google.com'); }} aria-label="Quick exit">
  <X /> Exit
</button>
```
Keyboard shortcut bhi (`Esc` double-tap ya configurable) power-users ke liye, optional.

---

## 8. Cron jobs (`backend/src/jobs/`, `node-cron`)

```js
// jobs/index.js
cron.schedule('* * * * *', () => reminders.run());              // har minute: session reminders due check
cron.schedule('*/5 * * * *', () => crisisEscalation.run());      // har 5 min: SLA check (section 4)
cron.schedule('0 * * * *', () => noShowSweeper.run());           // har ghante: missed sessions mark
cron.schedule('0 2 * * *', () => packageExpiry.run());           // roz 2 AM: expire packages
cron.schedule('0 3 * * *', () => slotHoldCleanup.run());         // roz 3 AM: orphan holds (TTL backup safety)
cron.schedule('0 9 * * 1', () => weeklyDigest.run());            // Monday 9 AM: wellness digest email
```

### 8.1 `reminders.job.js`
```js
export async function run() {
  const offsets = (process.env.MIND_REMINDER_OFFSETS || '1440,60,10').split(',').map(Number);
  for (const min of offsets) {
    const target = addMinutes(new Date(), min);
    const window = [addMinutes(target, -1), addMinutes(target, 1)];   // 2-min tolerance
    const due = await Appointment.find({ serviceLine: 'mental_health', status: 'Confirmed',
      startAt: { $gte: window[0], $lte: window[1] }, [`remindersSent.${min}`]: { $ne: true } });
    for (const appt of due) {
      await notify.sessionReminder(appt, min);
      await Appointment.updateOne({ _id: appt._id }, { [`remindersSent.${min}`]: true });
    }
  }
}
```
`Appointment.remindersSent` naya small object field (`{1440: true, 60: true, 10: true}`) taaki duplicate reminder na jaye.

### 8.2 `noShowSweeper.job.js`
Session `endAt` + 15 min grace paar ho gaya aur `joinedAt.patient`/`joinedAt.provider` me se koi khaali hai to us hisaab se `Missed`/system-cancel mark, refund/session-wapas trigger (file 06 §10 policy).

### 8.3 `packageExpiry.job.js`
`UserPackage.expiryDate < now` aur `status: 'active'` -> `status: 'expired'`, 7-din grace offer notification (file 06 §7.3).

### 8.4 `weeklyDigest.job.js`
Optional, opt-in (`user.mindSettings.weeklyDigest`): "Is hafte aapka mood trend, agla session, ek resource suggestion" — email, spammy na ho isliye default OFF.

---

## 9. Safety plan (patient self-service)

`SafetyPlan.tsx` (file 08 me listed nahi tha explicitly, yahan add — patient ke Mind Settings ya Wellness ke andar ek sub-page):
```
Warning signs: [add items]
Coping strategies: [add items]
Reasons to live/stay well: [add items]
Contacts: naam, phone, relation [add]
Professional contacts: [add]
Safe environment steps: [add items]
[Share with my provider] toggle (per provider)
```
Template/prompts diye jayenge (empty state me example suggestions), patient khud likhta hai. Ye `SafetyPlan` model (file 04 §3.7) me save, koi encryption zaroori nahi (crisis me turant readable hona chahiye) lekin access strict (file 05 permission matrix).

---

## 10. Test checklist

| # | Scenario | Expected |
|---|---|---|
| 1 | Chat me crisis keyword | `CrisisEvent` create ho, assigned provider + admin notify ho, patient ko turant koi harsh/alarming UI na dikhe (soft banner) |
| 2 | SOS button | Helpline sheet turant khule, network slow ho tab bhi numbers cached/offline-capable dikhein |
| 3 | Acknowledge na ho 15 min tak | Admin dashboard me urgent badge |
| 4 | Discreet mode ON | Sab reminders generic, crisis alert phir bhi poora detail (provider/admin ko) |
| 5 | Reminder job 2 baar chale (cron overlap) | Duplicate notification na jaye (`remindersSent` guard) |
| 6 | No-show sweeper | Sahi refund/session-wapas policy apply ho (file 06 §10 se match) |

# 13 — UI Design System + Animations

**Repo me abhi confirm kiya:** `frontend/src/index.css` me HSL CSS variables hain — `--primary: 174 62% 38%` (teal/emerald), `--radius: 0.75rem`, fonts `--font-heading: 'Plus Jakarta Sans'`, `--font-body: 'Inter'`, plus `--success`, `--warning`, `--info`, `--destructive`. **Naye Mind UI ko yehi tokens use karne hain, naye color variable ya naya font import NAHI karna** — merge ka poora point hi ye hai ki alag "theme" na lage.

Mind ke `reactbits/` (FlowingMenu, SplitText, BlurText, ElectricBorder, ScrollVelocity, GlowPanel) already exist karte hain aur achhe animation components hain — inhe **delete nahi**, sirf scope seemit: sirf `/mind` public landing page par (file 03 mapping table me already decided), dashboard/booking ke andar kabhi nahi (dashboard me flashy animation distracting hoti hai, especially mental-health context me).

---

## 1. Color usage (semantic, existing tokens se)

| Mind concept | Konsa existing token | Kyun |
|---|---|---|
| Wellness/positive (mood good, package active) | `--success` | Already "good" state ke liye use hota hai (Confirmed appointments etc) |
| Warning (package low, review due) | `--warning` | Consistent existing warning states se |
| Crisis/high-risk | `--destructive` | Existing "cancel/error" red, high-risk ke liye bhi wahi urgency-red sahi hai |
| Info (reminders, tips) | `--info` | |
| Mind & Wellness sidebar group accent | naya CSS var **nahi**, `--primary` ka hi ek shade (`hsl(var(--primary) / 0.65)` jaisa opacity variant) ya Tailwind `violet-500`/`indigo-500` sirf sidebar-group visual distinction ke liye (jaise "My Health" group `rose-500` use karta hai, existing pattern) | File 08 §2.2 me isi wajah se `violet` suggest kiya tha — existing "My Health" bhi apna alag accent (rose) use karta hai without naya CSS variable banaye, same tarika |

**Rule:** Naya `--mind-primary` jaisa variable mat banao. Existing tokens + Tailwind utility shades (jo already available hain, koi naya config nahi) se kaam chalao.

---

## 2. Typography

Koi naya font nahi. `--font-heading` (Plus Jakarta Sans) session/dashboard headings ke liye, `--font-body` (Inter) baaki sab — existing `font-heading`/`font-body` Tailwind classes reuse (already project me kahin defined hongi tailwind.config me, verify karna ek baar par naya add nahi karna).

Mental-health content ke liye ek chhota addition: **line-height thoda zyada** (`leading-relaxed`) long-form text (journal, intake forms, assessment questions) me — readability zyada zaroori hai jab user stressed ho, ye Tailwind utility hi hai, naya token nahi.

---

## 3. Component reuse map (naya mat banao, existing se compose karo)

| Naya UI need | Existing component (`components/ui/*`, shadcn) |
|---|---|
| Provider card, package card | `Card`, `Badge`, `Button` (jaise `DoctorCard`/hospital listing cards already banate hain) |
| Booking wizard steps | `Tabs`/`Stepper` pattern (agar exist karta hai) ya simple progress bar + conditional render (jaisa existing `BookingModal.tsx` karta hai) |
| Mood slider | `Slider` (Radix, agar `components/ui/slider.tsx` hai) — naya slider mat banao |
| Assessment runner | `RadioGroup` + `Progress` |
| Crisis banner | `Alert` (destructive variant) |
| Session note editor | `Textarea` + `Tabs` (SOAP fields) |
| Charts (mood trend, sessions) | `recharts` (already dependency), existing `EarningsAnalytics.tsx` jaisa chart-wrapping pattern copy karo |

Naya sirf tab likhna: `ProviderCard`, `PackageCard`, `MoodSlider` (wrapper around existing `Slider`), `AssessmentRunner`, `SlotPicker`, `PriceSummary`, `CrisisBanner`, `HelplineSheet` — ye sab file 03 §2 me already list hain, ye file bas unki visual language decide karti hai (upar wale tokens/components se banenge, from-scratch nahi).

---

## 4. Motion (framer-motion, already dependency)

**Principle: mental-health UI me motion subtle hona chahiye, flashy nahi.** Landing page (`MindLanding.tsx`) par bhale `reactbits` ka flair ho, dashboard/booking me:

| Interaction | Motion |
|---|---|
| Tab switch (counsellor dashboard) | Fade + 4px slide, 150ms — existing app ke transitions jaisa hi feel |
| Card hover | `scale-[1.02]`, existing card hover pattern se match (agar `DoctorCard` etc me already ye hai, wahi class copy karo) |
| Slot select | Selected slot ko halka `scale` + border highlight, koi bounce nahi |
| Crisis banner appear | **Motion minimal ya none** — turant, distraction-free dikhe, koi slide-in-with-delay wali cheez nahi |
| Session "joined" toast | Simple fade, existing `sonner` toast ka default hi (naya custom animation nahi) |
| Mood emoji select | Halka `scale` bounce (positive, playful — ye ek jagah hai jahan thoda warmth chahiye) |
| Package progress bar | Width transition 400ms ease-out, number count-up (existing `EarningsAnalytics` agar count-up karta hai wahi util reuse) |

`prefers-reduced-motion` respect karna (existing app agar already karta hai to same media query use karo, naya mat likho).

---

## 5. Accessibility

1. Crisis/helpline content: high contrast (WCAG AA minimum), bada font, koi low-opacity text nahi is section me.
2. Session room: captions/transcript ka concept abhi scope me nahi (future), lekin keyboard-navigable controls (mute, end call) zaroori — existing `VideoCallContext` UI agar already accessible hai to wahi pattern.
3. Assessment forms: radio groups properly labelled (`aria-label`), progress announce (`aria-live="polite"` "Question 3 of 9").
4. Quick exit button: keyboard-reachable, high z-index, kabhi kisi modal ke peeche na chhupe.
5. Color-only signal kabhi nahi (risk badge sirf red rang se nahi, icon + text "High risk" bhi).

---

## 6. Discreet mode visual rules (file 05 §9, file 12 se link)

Discreet mode ON hone par:
- Browser tab title generic ho sakta hai (`document.title = 'FindMedi'` instead of "Session with Dr. X") — optional enhancement, patient settings me toggle.
- Koi bhi email/push preview me "Therapy"/"Counselling"/"Psychiatrist" jaisa word na ho (file 12 §6 serializer se already handle, yahan sirf visual note).
- In-app UI khud discreet nahi hoti (login ke baad user apne dashboard me hai, wahan chhupane ki zaroorat nahi) — sirf **external-facing** cheezein (notification preview, email, tab title) discreet hoti hain.

---

## 7. Animation library (reactbits) — kab use karna hai, kab nahi

| Component | Kahan allowed |
|---|---|
| `SplitText`, `BlurText` | `MindLanding.tsx` hero heading only |
| `FlowingMenu` | Landing page nav (agar landing ka apna nav hai, PublicLayout ke andar) |
| `ScrollVelocity` | Landing page testimonials/features scroll section |
| `ElectricBorder`, `GlowPanel` | Landing page CTA cards only |
| Dashboard, booking, session room, admin | **Inme se koi bhi nahi** — plain existing `Card`/`Button`/framer-motion subtle transitions hi |

Ye rule explicit likhne ki wajah: pehle mind ka poora app hi reactbits-heavy tha (isiliye "alag app" lagta tha) — merge ke baad flair sirf marketing surface tak seemit, product surface professional/calm rehta hai jaisa baaki FindMedi hai.

---

## 8. Iconography

`lucide-react` (already dependency, AppSidebar isi se icons leta hai). Naye icons jo chahiye honge: `Brain` (already use ho raha hai `hospital_admin` ke "Mental Health" item me — reuse), `HeartHandshake`, `NotebookPen`, `ClipboardCheck`, `ShieldAlert` (crisis), `Sparkles` (wellness positive moments) — sab `lucide-react` me already available hain, koi custom SVG icon set nahi banana.

## 9. Checklist (design consistency)

| # | Check |
|---|---|
| 1 | Koi naya CSS variable/color token add nahi hua tailwind config/index.css me |
| 2 | Koi naya font import nahi hua |
| 3 | Dark mode mind ke sabhi naye components me automatically kaam kare (existing `dark:` classes ka pattern follow karke) |
| 4 | Crisis/helpline UI har jagah high-contrast, motion-free |
| 5 | reactbits sirf landing page files me import ho rahe hain, dashboard/booking files me nahi |

# 14 — Backend Implementation Guide (Step by Step, Order Fix Karke)

Ye file "kya karna hai" nahi, **"kis order me karna hai aur exact code kahan jayega"** batati hai. Har step ke baad ek chhota verification bhi hai. `backend/src/index.js` me route registration ka real pattern already confirm kiya (`app.use('/api/doctors', doctorRoutes)` type flat pattern, `protect`/`restrictTo` `middleware/auth.js` se export hote hain) — isi ke saath consistent code niche hai.

---

## Step 0 — Security hotfix (deploy se pehle, sabse pehle)

1. **Socket auth fix** (file 05 §3.1 ka code copy-paste karo `backend/src/services/socketService.js` me, `io.on('connection')` se pehle `io.use(...)` add karo). Ye is poore merge se **independent** hai, aaj hi ho sakta hai.
2. MindSupport server (`backend/mindsupport/server.js`) ko production se turant hata do ya firewall/private network tak seemit karo (file 01 §3.4).
3. `backend/mindsupport/scripts/seed-demo.js` ke demo credentials production DB me hain to turant password rotate/delete karo.
4. `git commit` — ye 3 cheezein ek chhota, alag PR honi chahiye, baaki merge se pehle bhi deploy ho sakti hai.

**Verify:** `curl -i https://<prod-domain>/socket.io/` handshake token ke bina fail ho (401/error), pehle jaisa silent-accept nahi.

---

## Step 1 — Models (naya code, kahin tootega nahi)

1. `backend/src/models/mind/` folder banao, file 04 §3 ke sab models likho (`CounsellorProfile.js`, `SupportPackage.js`, `UserPackage.js`, `IntakeForm.js`, `ConsentForm.js`, `SessionNote.js`, `MoodEntry.js`, `JournalEntry.js`, `WellnessGoal.js`, `Assessment.js`, `Assignment.js`, `PsychRxMeta.js`, `SafetyPlan.js`, `CrisisEvent.js`, `PeerPost.js`, `PeerComment.js`, `PeerReport.js`, `MindResource.js`, `ProviderReport.js`, `SlotHold.js`, `MindMessage.js`, `MindLegacyIdMap.js`). Ek file, ek model (file 03 §5 rule #4).
2. `User.js` me role enum me `'counsellor'` add karo (ek line, existing enum tootega nahi kyunki addition hai).
3. `Doctor.js` me `mentalHealth: {...}` sub-doc add karo (file 04 §2.2, `bufferMin` field bhi yahin — file 06 correction #1: `mentalHealth.bufferMin || 10` sahi expression, purani `Doctor.bufferPerHour` se confuse mat karna).
4. `Appointment.js` me file 04 §2.3 ke naye fields + indexes add karo. **`slotActive` bharne ka hook bhi isi step me likho** (file 06 ki correction #4 — pehle chhoot gaya tha):
```js
// Appointment.js ke end me, existing schema.index() calls ke baad
appointmentSchema.pre('save', function (next) {
  this.slotActive = ['Pending', 'Confirmed'].includes(this.status) && !!this.startAt && !!this.providerUserId;
  next();
});
```
Aur jahan bhi `Appointment.updateOne`/`findOneAndUpdate` se status badalte ho (booking cancel/confirm/decline services), `slotActive` explicitly saath set karo — `pre('save')` sirf `.save()` par chalta hai, `updateOne` par nahi (Mongoose ka common gotcha, is baat ko services likhte waqt (Step 4) yaad rakhna).
5. `Payment.js`, `Notification.js`, `Review.js` me file 04 §2.4/§2.5 ke naye enum values/fields add karo.

**Verify:** `node -e "import('./src/models/mind/CounsellorProfile.js').then(() => console.log('ok'))"` — sab models bina error load hon. Existing tests (`npm test` agar hai) still pass.

---

## Step 2 — Env aur config

1. `backend/.env` me file 02 §6 ke sab vars add karo. `openssl rand -hex 32` se `MIND_NOTES_KEY_V1` generate karo.
2. `backend/src/config/mind.js` likho — startup par validate kare ki required vars hain, warna **server start hi fail kare** (file 02 §6: "Key na ho to server start hi fail kare" — ye no-fallback rule sabse important security decision hai, isko chhoro mat):
```js
export function loadMindConfig() {
  const required = ['MIND_NOTES_KEY_CURRENT', 'MIND_NOTES_KEY_V1'];
  for (const k of required) if (!process.env[k]) throw new Error(`Missing required env: ${k}`);
  return {
    enabled: process.env.MIND_ENABLED === 'true',
    slotHoldMinutes: Number(process.env.MIND_SLOT_HOLD_MINUTES || 5),
    reminderOffsets: (process.env.MIND_REMINDER_OFFSETS || '1440,60,10').split(',').map(Number),
    defaultCommissionPct: Number(process.env.MIND_DEFAULT_COMMISSION_PCT || 20),
    helplines: JSON.parse(process.env.MIND_CRISIS_HELPLINES_JSON || '[]'),
  };
}
```
`backend/src/index.js` ke bilkul shuru me `loadMindConfig()` call karo (baaki app start hone se pehle fail-fast).

**Verify:** Env var missing karke `npm run dev` chalao — server turant crash ho readable error ke saath, silently fallback na kare.

---

## Step 3 — Crypto, policies, middleware (`modules/mind/lib`, `modules/mind/policies`)

1. `lib/crypto.js` — AES-256-GCM `encryptField`/`decryptField`, key versioning (`MIND_NOTES_KEY_<id>` se load, `keyId` data ke saath store).
2. `lib/sanitize.js` — `sanitize-html` wrapper, journal/peer-post ke liye.
3. `lib/time.js` — `istToUtc`, `to12h`, IST helpers (file 06 §5.2 se already code hai, wahi yahan move karo).
4. `policies/access.js` — file 05 §5 ka poora code as-is.
5. `middleware/requireProvider.js`, `middleware/requireConsent.js`, `middleware/auditReads.js` — file 05 se.

**Verify:** `encryptField('test')` -> `decryptField(...)` round-trip test likho (jest), pehla real test isi step me.

---

## Step 4 — Services (business logic, koi HTTP nahi)

Order matters kyunki baad ke services pehle wale use karte hain:
1. `slotEngine.js` (file 06 §5, `dow` unused variable **na likhna** — correction #2, sirf `weekday` use karo).
2. `pricingService.js`, `packageService.js` (file 06 §7-8).
3. `crisisService.js` (file 12 §1-3).
4. `bookingService.js` (file 06 §6, sabse complex — `slotEngine` + `packageService` + `pricingService` depend karta hai).
5. `sessionService.js` (file 07 §4.3, §5).
6. `earningsService.js`, `refundService.js` (file 06 §9, §7.4).
7. `reminderService.js`, `matchService.js`, `assessmentScoring.js` (PHQ-9/GAD-7 scoring formula — standard clinical scoring, config me severity cutoffs rakhna hardcode ki jagah).

Har service ka ek matching test file `backend/test/mind/*.test.js` (file 02 §10) usi step me likho, agle service pe mat badho jab tak pichhle ka test pass na ho.

**Verify:** `npm test -- mind/` — sab unit tests pass.

---

## Step 5 — Routes (`modules/mind/routes/*.js` + `modules/mind/index.js`)

File 02 §4 ka `modules/mind/index.js` structure as-is likho. Har route file `routes (HTTP) -> validators (zod) -> policies -> services -> models` layering follow kare (koi business logic route file me nahi — Step 4 ke services hi call honge).

```js
// backend/src/index.js me, existing route registrations ke saath (line ~360 ke aas-paas)
import mindRoutes from './modules/mind/index.js';
import publicMindRoutes from './modules/mind/routes/public.routes.js';
app.use('/api/mind', mindRoutes);            // andar hi protect+audit hai
app.use('/api/public/mind', publicMindRoutes); // public discovery, apna alag rate limit
```

Public routes pehle likhna (koi auth complexity nahi, discovery API — file 06 §2.2), phir booking/availability (sabse critical path), phir wellness/treatment/peer/resources/safety (kam risky), aakhir me admin (Step 8 se pehle bhi ho sakta hai, dependency nahi).

**Verify:** Postman/curl se `GET /api/public/mind/providers` bina token ke 200 de, `GET /api/mind/bookings/my` bina token ke 401 de.

---

## Step 6 — Realtime (socketService.js extend)

File 07 §3.2 ke `mind:join_session`, `mind:leave_session`, `mind:end_session` events add karo existing `io.on('connection')` block me (Step 0 ka auth fix already ho chuka hoga, isi par build hoga). File 02 §7 table ke baaki events (`mind:booking_requested` etc) jahan trigger hote hain wahi services se emit karo (jaise `bookingService.createBooking` ke end me `io.to('user:'+providerId).emit('mind:booking_requested', ...)`).

**Verify:** Do browser tab (patient + provider login) se ek booking create karo, provider tab me real-time notification aaye bina refresh kiye.

---

## Step 7 — Jobs (`backend/src/jobs/`)

File 12 §8 ka poora code. `jobs/index.js` ko `backend/src/index.js` ke server-start ke baad call karo (`if (config.enabled) jobs.start()`), taaki `MIND_ENABLED=false` par cron bhi na chale.

**Verify:** Ek test appointment `startAt` ko 10 minute aage manually DB me set karo, reminder job manually trigger karo (`node -e "import('./jobs/reminders.job.js').then(m => m.run())"`), notification bane.

---

## Step 8 — Admin routes + verification script

1. `admin.routes.js` (file 11 §10).
2. `scripts/mind/audit-open-routes.mjs` — file 01 §3 ki tarah ek script jo **naye** `/api/mind/*` routes ko bhi bina-token check kare, CI me chalao taaki koi naya route galti se public na reh jaye:
```js
// simplified idea
const routes = extractRoutesFromRouter(mindRouter);
for (const r of routes) {
  const res = await fetch(`http://localhost:${PORT}${r.path}`, { method: r.method });
  if (res.status !== 401) console.warn(`OPEN ROUTE (no auth): ${r.method} ${r.path}`);
}
```

**Verify:** Script chala ke output empty aana chahiye (koi open route report na ho, sirf `/api/public/mind/*` expected-open list me).

---

## Step 9 — Migration (dry-run pehle, hamesha)

1. `.env` me `MINDSUPPORT_URI` set karo (purana DB, read-only access kaafi hai).
2. `mongodump` dono DB ka (`findmedi` aur `mindsupport`) — rollback ke liye (file 04 §9).
3. `node backend/scripts/mind/migrate-from-mindsupport.mjs --dry` — stats dekho, ajeeb numbers (`users_created` bahut zyada, ya `notes_failed` high) to migration script me bug hai, real run se pehle fix karo.
4. Staging environment par pehle real run + `verify-migration.mjs` (file 04 §8 ki checklist).
5. Production freeze window announce karo (mind server already down hai Step 0 se, to freeze ka matlab bas "naya mind data create mat hone do purane system me" — jo waise bhi band hai).
6. Production migrate + verify.
7. 30 din `mindsupport` DB delete na karo (file 04 §9).

**Verify:** File 04 §8 ki poori table pass honi chahiye, khaaskar "Login: 3 sample users bcrypt compare pass" — agar ye fail hui to migrated users login nahi kar payenge, ye sabse critical check hai.

---

## Step 10 — Cleanup

1. `backend/mindsupport/` folder delete (route registration `backend/mindsupport/server.js` bhi hat jayega, koi jagah reference na ho check karo: `grep -rn "mindsupport/server" backend/`).
2. `package.json` se `dev:mind`/`start:mind` scripts hatao.
3. `MIND_PORT`, alag `MONGODB_URI`, mind wala `CORS_ORIGIN` env vars hatao.

**Verify:** `npm run dev` (sirf main server) se poora app chale, `backend/mindsupport` reference kahin na bache (`grep -rn "mindsupport" backend/src frontend/src` sirf naye `/api/mind`, `mind/` path wale legitimate matches dikhaye, purana server reference koi nahi).

---

## Order summary (ek nazar me)

```
0. Socket auth fix + mind server private        (aaj hi, deploy-safe)
1. Models                                        (naya code, safe)
2. Env + config (fail-fast)                      (safe)
3. Crypto/policies/middleware                    (safe, testable)
4. Services (test-driven, order se)               (safe)
5. Routes                                         (yahan se API live hoti hai)
6. Realtime events                                (Step 5 par depend)
7. Jobs                                           (Step 4-5 par depend)
8. Admin + audit script                           (parallel ho sakta hai Step 5 ke saath)
9. Migration (dry-run -> staging -> prod)          (Step 1 poora hone ke baad kabhi bhi)
10. Cleanup (purana delete)                        (sabse aakhir, 9 stable hone ke baad)
```
Frontend (file 15) Step 5 ke baad kahin bhi parallel shuru ho sakta hai — backend APIs jaise-jaise ready hon, corresponding frontend feature unlock hota jaye.


# 15 — Frontend Implementation Guide, Testing, Rollout

File 14 ka frontend jodi. Order backend ke saath parallel chal sakta hai — jahan bhi ek backend route (file 14, Step 5) ready ho, uska frontend feature turant unlock kiya ja sakta hai.

---

## 1. Order (feature-by-feature, chhota se bada)

### Step F1 — Shell aur sidebar (koi backend dependency nahi, pehle hi ho sakta hai)
1. `AppSidebar.tsx` me file 08 §2.1-2.2 ka `isMind` group add karo — **sirf UI, koi data nahi abhi**, dummy/static links.
2. `mindRoutes.tsx` banao, lazy-loaded empty placeholder pages (`<div>Coming soon</div>`) har route ke liye — taaki naviagtion turant test ho sake.
3. `App.tsx` me `<Routes>{mindRoutes}</Routes>` jodo, `frontend/src/mind` ka poora import **abhi delete mat karo** (parallel chalte rahenge jab tak naya feature-parity na ho — Strangler pattern, file 02 §1 principle #5).

**Verify:** Sidebar me "Mind & Wellness" group dikhe, expand/collapse kaam kare, dummy pages navigate hon.

### Step F2 — Discovery + provider profile (backend Step 5 ka public routes ready hone par)
1. `features/mind/api/providers.ts` (`useProviders`, `useProvider`).
2. `find/FindMindCare.tsx`, `find/ProviderProfile.tsx` (file 06 §2-3).
3. `components/ProviderCard.tsx`, `ProviderFilters.tsx`.

**Verify:** `/find-care/mind` par real providers list ho (seed data se), filter/search kaam karein.

### Step F3 — Booking wizard
1. `features/mind/api/{availability,bookings,packages}.ts`.
2. `booking/BookingWizard.tsx` + `useBookingMachine.ts` + 7 step files (file 06 §4).
3. `SlotPicker.tsx`, `ModeSelector.tsx`, `PackageCard.tsx`, `PriceSummary.tsx`.

**Verify:** File 06 §15 ki poori test scenario table manually (ya Playwright se) chalao — slot hold expiry, double-booking, package reservation race sab.

### Step F4 — Session room
1. `features/mind/session/SessionRoom.tsx`, `PreSessionCheck.tsx`, `PostSession.tsx`, `SessionChat.tsx` (file 07 §3, §6-8).
2. Existing `VideoCallContext`/`AudioCallContext` ko import karke wrap karo, naya call system mat likho.

**Verify:** Do account se ek confirmed session join karo, video/audio/chat teeno mode test karo, provider notes save ho.

### Step F5 — Patient dashboard pages
File 08 §3-5 ki poori list, ek-ek karke (`MindHome` sabse pehle, kyunki entry point hai):
`MindHome -> MySessions -> MySchedule -> MyPackages -> Wellness -> Journal -> Homework -> Treatment -> MindSettings`.

**Verify:** File 08 §11 ka test checklist.

### Step F6 — Counsellor dashboard
File 09 ke 14 tabs, order: `Verification/Profile (gate)` pehle (kyunki bina iske kuch aur test nahi ho sakta — seed data me ek approved counsellor rakhna easier hoga dev ke liye), phir `Overview -> Requests -> Sessions -> Schedule -> Clients -> Notes -> Homework -> Packages -> Earnings -> Resources -> Reviews -> Settings`.

**Verify:** File 09 §20.

### Step F7 — Psychiatrist extras
File 10 ke naye pages, existing `DoctorPatients.tsx` ko parametrize karna sabse pehla kaam (`filterServiceLine` prop add — existing component me sirf ek prop add hone se koi existing usage break nahi hoga, backward compatible).

**Verify:** File 10 §13.

### Step F8 — Admin console
File 11 ke pages, `/admin/mind/providers` pehle (verification flow ke bina counsellor test hi nahi ho sakta — isliye ideally Step F6 se pehle ya parallel karna behtar, dev environment me).

**Verify:** File 11 §11.

### Step F9 — Safety/crisis UI
`CrisisBanner.tsx`, `HelplineSheet.tsx`, `QuickExitButton.tsx`, `SafetyPlan.tsx` (file 12) — ye har dashboard step ke saath jud sakte hain, par ek dedicated pass zaroori hai poori coverage ke liye (har page par QuickExit hai ki nahi, check karo).

**Verify:** File 12 §10.

### Step F10 — Cleanup
1. `frontend/src/mind/` poora delete.
2. `react-redux`, `@reduxjs/toolkit` (agar kahin aur use nahi) `package.json` se hatao.
3. `App.tsx` se purana mind import hatao, sirf naya `mindRoutes` rahe.
4. Purane redirects (file 03 §4 table) add karo `App.tsx` me.

**Verify:** `grep -rn "from '@/mind\|from '\.\./mind\|from '\.\./\.\./mind" frontend/src` — koi match na aaye (naye code me purane `mind/` folder ka koi import na bacha ho).

---

## 2. Local dev setup (do developers parallel kaam kar rahe hon to)

```bash
# .env checklist
MIND_ENABLED=true
MIND_NOTES_KEY_CURRENT=v1
MIND_NOTES_KEY_V1=<openssl rand -hex 32>
VITE_MIND_ENABLED=true

# seed
node backend/scripts/mind/seed-mind-demo.mjs
# output: random passwords for 3 counsellors, 2 psychiatrists, 1 demo patient — save inhe apne local .env.local.notes me (git-ignored), team-wide seed ka ek shared password file NAHI banana (file 04 §10 rule: hard-coded password nahi)
```

---

## 3. Testing pyramid (file 02 §10 ka frontend hissa)

| Layer | Tool | Priority coverage |
|---|---|---|
| Unit (hooks, utils) | vitest | `slotEngine` client-side date formatting, `useBookingMachine` state transitions |
| Component | vitest + testing-library | `BookingWizard` step validation, `MoodSlider`, `AssessmentRunner` scoring display |
| E2E (optional, high-value paths) | Playwright | Booking se session tak (F3+F4), counsellor approve-decline flow (F6), crisis SOS flow (F9) |
| Manual QA pass | — | Poora regression checklist (section 5) |

**Sabse zaroori automated test (agar sirf 3 likhne ho time kam hai):**
1. Booking double-click idempotency (file 06 §15, scenario #15).
2. Permission matrix (file 05 §13 — backend test hai, par frontend bhi verify kare ki 403/404 par sahi error screen dikhe, na ki crash).
3. Crisis flag -> notification round-trip (file 12 §10 scenario #1).

---

## 4. Performance checklist (file 02 §8 targets verify karna)

1. `mindRoutes.tsx` ke sab routes `React.lazy()` + route-level code split (koi bhi mind page medical bundle ke saath na bunde).
2. `MindHome.tsx` ek hi aggregate API call kare (file 08 §4), 6 alag nahi.
3. Provider discovery list virtualized/paginated ho agar providers 50+ ho jayen (abhi shayad zaroorat na ho, par API already `page`/`limit` support karta hai file 06 §2.2 se).
4. Images (provider photos) lazy-load + existing Cloudinary transform (`w_200` jaisa) use karo, full-res na khinch.

**Verify:** Lighthouse/Chrome DevTools se `/patient/mind` aur `/find-care/mind` ka load time file 02 §8 target (`< 2.5s` on 4G throttle) ke andar.

---

## 5. Manual regression checklist (rollout se pehle, poora)
**Patient side**
- [ ] Sidebar me ek hi "Mind & Wellness" group, purana `/mind` sidebar kahin nahi
- [ ] Purane `/mind/*` bookmark redirect ho rahe (file 03 §4 table poori)
- [ ] Notification bell ek hi, mind events usi me aate hain
- [ ] Theme/language switch mind pages par bhi apply
- [ ] Booking (counsellor + psychiatrist, single + package, sab 4 mode) end-to-end
- [ ] Session join (video/audio/chat/in-person) sab
- [ ] Journal share/unshare toggle provider side reflect kare
- [ ] Quick exit button har mind page par
- [ ] Anonymous booking — provider ko naam na dikhe kahin

**Counsellor side**
- [ ] Verification-pending gate sahi (sirf profile/verification accessible)
- [ ] Tab URL refresh-safe (`?tab=` sync)
- [ ] Sirf apne relationship-wale clients dikhein
- [ ] Vacation mode turant discovery se hataye

**Psychiatrist side**
- [ ] Non-mental-health doctor ko koi extra item na dikhe
- [ ] Prescription likhne ke baad patient ki normal Prescriptions list me turant

**Admin side**
- [ ] Approve/reject provider turant discovery reflect kare
- [ ] Crisis monitor me kabhi PHI text na dikhe
- [ ] Analytics sirf aggregate, drill-down individual patient tak na jaye

**Security (Step 0 se re-verify)**
- [ ] Socket handshake bina token ke reject
- [ ] `audit-open-routes.mjs` clean
- [ ] Migration ke baad sample users login test pass

---

## 6. Rollout plan (phased, file 00 §5 roadmap ke saath align)

| Phase | Kya live hota hai | Rollback agar issue |
|---|---|---|
| 1 | Backend merge, mind server band (users ko kuch nahi dikhta, sab backend hi hai) | Purana mind server wapas on karo (temporary), `git revert` |
| 2 | Booking engine live, par sidebar me abhi feature-flag ke peeche (`VITE_MIND_ENABLED=false` production me) | Flag off karo, turant purani state |
| 3 | Internal team/beta users ke liye flag on (chhota %) | Flag off |
| 4 | Migration run, sab users ke liye flag on | `MindLegacyIdMap` se selective rollback (file 04 §9) |
| 5 | Purana `frontend/src/mind` aur `backend/mindsupport` delete (Step 10, dono files) | Isse pehle ke sab phases stable 30 din rahne ke baad hi ye step |

Feature flag (`VITE_MIND_ENABLED`, `MIND_ENABLED`) file 02 §5 me already defined hai — isi ko rollout gate ki tarah use karo, alag mechanism nahi banana.

---

## 7. Documentation set — poora index (recap)

| # | File | Status |
|---|---|---|
| 00 | Index, roadmap, decisions | ✅ |
| 01 | Current state audit | ✅ |
| 02 | Architecture + tech stack | ✅ |
| 03 | Folder structure | ✅ |
| 04 | Database + migration | ✅ |
| 05 | Auth, roles, privacy | ✅ |
| 06 | Booking flow | ✅ |
| 07 | Session room + care delivery | ✅ |
| 08 | Unified user dashboard | ✅ |
| 09 | Counsellor dashboard | ✅ |
| 10 | Psychiatrist dashboard | ✅ |
| 11 | Admin console | ✅ |
| 12 | Safety, crisis, notifications | ✅ |
| 13 | UI design system + animations | ✅ |
| 14 | Backend implementation guide | ✅ |
| 15 | Frontend implementation, QA, rollout | ✅ (ye file) |

Poori 16-file set ab complete hai (00-15). File 00 ko is naye index ke hisaab se ek baar refresh karna sahi rahega (Phase 0 me socket-fix line add karna — jo pehle chhoot gaya tha) — agle message me chahiye to wo bhi kar deta hu.
# 🏥 MediCore - Hospital Management System

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/MongoDB-Foundation-green?style=for-the-badge&logo=mongodb" alt="MongoDB">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

A comprehensive, production-ready Hospital Management System (HMS) built with the MERN stack. MediCore enables healthcare facilities to manage **patients, doctors, appointments, medical records, billing, emergency cases, notifications, and generate professional reports** — all in one unified platform.

---

## 📋 Table of Contents

- [✨ Features](#-features)
  - [👨‍⚕️ Doctor Portal](#️-doctor-portal)
  - [👤 Patient Portal](#️-patient-portal)
  - [👑 Admin Dashboard](#-admin-dashboard)
  - [🔔 Real-Time Notifications](#-real-time-notifications)
  - [📄 PDF Report Generation](#-pdf-report-generation)
  - [💳 Billing & Payments](#-billing--payments)
  - [🚨 Emergency Management](#-emergency-management)
  - [📊 Analytics & Insights](#-analytics--insights)
  - [📁 Import/Export Data](#-importexport-data)
  - [📁 File Upload & Management](#-file-upload--management)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)
- [🔌 API Endpoints](#-api-endpoints)
- [🌐 Environment Variables](#-environment-variables)
- [🏗️ Deployment](#-deployment)
- [📄 License](#-license)

---

## ✨ Features

### 👨‍⚕️ Doctor Portal

**Dashboard Overview**
- Today's appointments count
- Pending/Completed appointment tracking
- Total earnings summary
- Average patient rating
- Recent activity feed

**Appointment Management**
- View all assigned appointments
- Filter by status (Pending, Confirmed, Completed, Cancelled)
- Update appointment status & add notes
- View patient details and medical history
- Appointment scheduling availability

**Patient Management**
- Access assigned patient list
- View patient medical history and records
- Contact information and demographics

**Medical Records Creation**
- Generate **prescriptions** with medication details
- Create **lab reports** with test results
- Issue **discharge summaries**
- Attach files and images to records

**Earnings & Billing**
- Track personal revenue (paid invoices)
- View pending payments
- Access billing history

**Schedule Management**
- Set available time slots
- Define weekly schedule
- Manage leaves and time off

**Reviews & Feedback**
- View patient reviews and ratings
- Track review count and average rating

**Notifications**
- Real-time alerts for new appointments
- Payment received notifications
- Emergency case assignments
- System announcements

---

### 👤 Patient Portal

**Dashboard**
- Upcoming appointments count
- Pending bills summary
- Recent medical records
- Unread notifications
- Available doctors quick-access

**Appointment Booking**
- Search doctors by name or specialization
- Filter by availability and department
- Book appointments with date/time selection
- Appointment type selection (Consultation, Follow-up, Check-up, Emergency)
- View and cancel upcoming appointments
- Reschedule functionality

**Medical Records**
- View all personal medical records
- Filter by type (Diagnosis, Prescription, Lab Report, Imaging)
- Download PDF reports
- Track medical history

**Billing & Payments**
- View pending invoices
- View payment history
- Multiple payment methods (Card, UPI, Net Banking, Cash)
- Secure payment processing
- Payment confirmation notifications

**Doctor Discovery**
- Browse all available doctors
- View doctor profiles (specialization, experience, rating, location)
- Read patient reviews
- Direct booking from doctor card

**Notifications**
- Appointment reminders
- Payment confirmations
- New prescription alerts
- Lab result notifications

---

### 👑 Admin Dashboard

**Analytics Overview**
- Total registered patients and doctors
- Today's appointments count
- Month-to-date revenue
- Real-time statistics cards

**Advanced Charts**
- Weekly appointments trend (bar chart)
- Monthly revenue trend (line chart)
- Department distribution (pie chart)
- Recent appointments feed

**User Management**
- Create, view, update, delete users
- Assign roles (Admin, Doctor, Patient)
- Block/unblock users
- Search and filter users

**Doctor Management**
- Onboard new doctors
- Approve/reject doctor registrations
- Edit doctor profiles
- Set consultation fees
- Manage availability
- View doctor list with filters

**Patient Management**
- View all patient records
- Edit patient information
- Track admission status
- Manage patient-doctor assignments

**Department Administration**
- Create and manage departments
- Set department heads
- Configure fees structure
- Activate/deactivate departments

**Billing Oversight**
- View all invoices across platform
- Track payment status
- Financial reporting

**Emergency Case Oversight**
- Monitor all emergency cases
- Assign doctors to emergencies
- Track case status and response times
- Add notes to emergency cases

**Reviews Moderation**
- View all patient reviews
- Manage review visibility

---

### 🔔 Real-Time Notifications

**Notification Types:**
- **Appointment** – New booking, status changes, reminders
- **Payment** – Invoice created, payment successful, payment received (doctor)
- **System** – Emergency assignments, admin announcements
- **Records** – New prescription, lab report ready, discharge summary

**Recipients:**
- **Doctors** receive: appointment notifications, payment received, emergency assignments
- **Patients** receive: appointment reminders, payment confirmations, record alerts
- **Admins** receive: system-wide alerts, new user registrations, emergency cases

**Features:**
- Bell icon with unread count badge
- Notification center page
- Mark individual as read
- Mark all as read
- Clear all notifications
- Real-time updates (polling every 5s)

**Fix Applied:** Doctor notifications now correctly resolve User ID mapping via Doctor.user_id field, ensuring doctors see their notifications while preserving admin/patient behavior.

---

### 📄 PDF Report Generation

**Prescriptions**
- Professional hospital letterhead
- Patient demographics
- Doctor signature and details
- Medication table with dosage/frequency/instructions
- Diagnosis and advice sections
- Follow-up date
- Print/download options

**Lab Reports**
- Test details and patient info
- Test results with units and reference ranges
- Doctor's interpretation
- Laboratory branding
- Report ID and dates

**Discharge Summaries**
- Complete hospital stay summary
- Admission/discharge dates
- Diagnosis and treatment provided
- Medications prescribed
- Follow-up instructions
- Surgeries performed (if any)

**Features:**
- Auto-save to patient medical records
- Email delivery capability
- Cloudinary image attachment support

---

### 💳 Billing & Payments

**Invoice Management**
- Auto-generate invoice IDs (INV-0001 format)
- Create invoices with line items
- Support for multiple services
- Due date calculation (15 days default)
- Status tracking (Pending, Paid, Partial, Overdue)

**Payment Processing**
- Multiple payment methods: Card, UPI, Net Banking, Cash
- Transaction ID generation
- Instant status update
- Payment confirmation notifications

**Financial Tracking**
- Total revenue calculation
- Outstanding amounts
- Payment history with filters
- Doctor-wise earnings reporting

**Notifications**
- Patient notified on payment success
- Doctor notified when payment received

---

### 🚨 Emergency Management

**Case Handling**
- Report new emergency with severity level (Critical, Serious, Stable)
- Automatic admin notification
- Assign doctors to emergencies
- Track response time
- Add case notes and updates

**Status Workflow**
- Pending → Assigned → Under Treatment → Discharged/Transferred

**Notifications**
- Admins alerted on new emergency
- Doctors notified on assignment
- Real-time status updates

**Doctor Interface**
- View assigned emergencies
- Update status and add notes
- Track emergency history

---

### 📊 Analytics & Insights

**Dashboard Metrics**
- Patient and doctor counts
- Daily appointment volume
- Revenue trends
- Department-wise statistics

**Visualizations**
- Weekly appointment bar chart
- Monthly revenue line chart
- Department distribution pie chart
- Recent appointments table

**Role-Specific Views**
- Admin: System-wide overview
- Doctor: Personal performance stats
- Patient: Personal health timeline

---

### 📁 Import/Export Data

**Export (Excel/CSV)**
- Export patient list with full details
- Export doctor directory
- Export billing records
- One-click download

**Import (Excel)**
- Bulk patient registration via Excel
- Column validation and error reporting
- Duplicate detection
- Import summary with success/failure counts

---

### 📁 File Upload & Management

**Cloudinary Integration**
- Upload medical images (X-rays, scans, photos)
- Upload documents (prescriptions, reports)
- Automatic image optimization
- Secure URL storage

**Use Cases**
- Attach images to medical records
- Profile photo upload for doctors
- Document attachments in billing
- Emergency case file uploads

**Model Fields**
- `profile_photo` in Doctor model
- `attachments` array in Record model
- `storedIn` tracking (cloudinary/local)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **UI Library** | shadcn/ui components |
| **Routing** | React Router v6 |
| **State Management** | React Query (TanStack), Context API |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose ODM |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |
| **PDF Generation** | PDFKit |
| **Email** | Nodemailer (SMTP) |
| **Image Processing** | Sharp |
| **Import/Export** | xlsx, json2csv |
| **File Upload** | Multer |
| **Cloud Storage** | Cloudinary (optional) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- MongoDB (local or Atlas cloud)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/mahendra0011/medicore.git
cd medicore

# Install dependencies (root)
npm run install:all

# Configure environment variables
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT_SECRET
```

**Environment file (.env):**
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medicore
JWT_SECRET=your_strong_secret_key_here

# Optional: Cloudinary for image upload
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: SMTP for emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### Run Development Server

```bash
# Start both frontend and backend (concurrently)
npm run dev

# Or run individually:
npm run dev --prefix server   # Backend: http://localhost:5000
npm run dev --prefix client   # Frontend: http://localhost:8080
```

### Seed Demo Data

```bash
npm run seed
```

This populates the database with sample users, doctors, patients, appointments, and billing records.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@mediCore.com | password |
| Doctor | sarah.smith@mediCore.com | password |
| Doctor | raj.patel@mediCore.com | password |
| Patient | sarah.johnson@email.com | password |
| Patient | patient@mediCore.com | password |

---

## 📁 Project Structure

```
medicore/
├── client/                        # React Frontend (Vite)
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   │   ├── ui/              # shadcn/ui primitives
│   │   │   └── *.jsx            # Feature components
│   │   ├── context/             # React contexts (Auth, Notifications)
│   │   ├── lib/                 # API client, utilities
│   │   ├── pages/               # Route pages
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── doctor/          # Doctor portal pages
│   │   │   ├── patient/         # Patient portal pages
│   │   │   └── *.jsx            # Shared pages
│   │   └── main.jsx             # App entry point
│   └── public/                  # Static assets
├── server/                       # Express Backend
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js              # User (auth) model
│   │   ├── Doctor.js            # Doctor profile model
│   │   ├── Patient.js           # Patient record model
│   │   ├── Appointment.js       # Appointment model
│   │   ├── Billing.js           # Invoice model
│   │   ├── Notification.js      # Notification model
│   │   ├── Record.js            # Medical record model
│   │   ├── Emergency.js         # Emergency case model
│   │   ├── Review.js            # Review/rating model
│   │   └── Department.js        # Department model
│   ├── routes/                  # API route handlers
│   │   ├── auth.js              # Login, register, profile
│   │   ├── users.js             # User CRUD (admin)
│   │   ├── doctors.js           # Doctor profiles & lookup
│   │   ├── patients.js          # Patient records
│   │   ├── appointments.js      # Appointment booking & management
│   │   ├── billing.js           # Invoices & payments
│   │   ├── records.js           # Medical records & PDFs
│   │   ├── notifications.js     # Notification center
│   │   ├── emergency.js         # Emergency case handling
│   │   ├── dashboard.js         # Analytics & stats
│   │   ├── reviews.js           # Doctor reviews
│   │   ├── departments.js       # Department CRUD
│   │   ├── reports.js           # Excel import/export
│   │   └── upload.js            # File upload endpoint
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── services/
│   │   └── cloudinaryService.js # Cloudinary image upload
│   ├── utils/
│   │   └── generatePDF.js       # PDF report generation
│   ├── seed.js                  # Database seeding script
│   └── index.js                 # Server entry point
├── README.md
└── package.json
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (returns JWT) |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Doctors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/doctors` | List all doctors (filterable) |
| GET | `/api/doctors/:id` | Get doctor by ID |
| GET | `/api/doctors/user/:userId` | Get doctor profile by User ID |
| POST | `/api/doctors` | Create doctor profile |
| PUT | `/api/doctors/:id` | Update doctor profile |
| PUT | `/api/doctors/:id/approve` | Approve doctor (admin) |
| DELETE | `/api/doctors/:id` | Delete doctor (admin) |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List all patients (admin/doctor) |
| POST | `/api/patients` | Create patient record |
| PUT | `/api/patients/:id` | Update patient |
| DELETE | `/api/patients/:id` | Delete patient |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments` | List appointments (role-filtered) |
| GET | `/api/appointments/my-appointments` | Get logged-in user's appointments |
| GET | `/api/appointments/:id` | Get appointment details |
| POST | `/api/appointments` | Book new appointment |
| PUT | `/api/appointments/:id` | Update status, reschedule |
| DELETE | `/api/appointments/:id` | Cancel appointment |

### Medical Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/records` | List all records (filterable) |
| GET | `/api/records/patient/:patientId` | Get patient's records |
| POST | `/api/records` | Create medical record |
| DELETE | `/api/records/:id` | Delete record |

**PDF Generation:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/generate-prescription` | Generate prescription PDF |
| POST | `/api/reports/generate-lab-report` | Generate lab report PDF |
| POST | `/api/reports/generate-discharge-summary` | Generate discharge summary PDF |

### Billing & Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/billing` | List invoices (role-filtered) |
| POST | `/api/billing` | Create new invoice |
| PUT | `/api/billing/:id` | Update invoice (status change triggers notifications) |
| PUT | `/api/billing/:id/pay` | Mark invoice as paid |
| DELETE | `/api/billing/:id` | Delete invoice |
| GET | `/api/billing/services` | Get lab services catalog |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications (role-filtered) |
| GET | `/api/notifications/unread-count` | Get unread count |
| POST | `/api/notifications` | Create notification (admin only) |
| PUT | `/api/notifications/:id/read` | Mark single notification as read |
| PUT | `/api/notifications/mark-all-read` | Mark all as read (role-filtered) |
| DELETE | `/api/notifications/:id` | Delete notification |
| DELETE | `/api/notifications/clear-all` | Clear all (role-filtered) |

### Emergency Cases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emergency` | List emergencies (role-filtered) |
| POST | `/api/emergency` | Report new emergency |
| PUT | `/api/emergency/:id/assign` | Assign doctor to emergency |
| PUT | `/api/emergency/:id/status` | Update status |
| POST | `/api/emergency/:id/notes` | Add note to emergency |
| GET | `/api/emergency/stats` | Get emergency statistics |

### Users & Admins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin only, filterable) |
| DELETE | `/api/users/:id` | Delete user (admin) |
| PUT | `/api/users/:id/block` | Block/unblock user (admin) |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| POST | `/api/departments` | Create department (admin) |
| PUT | `/api/departments/:id` | Update department (admin) |
| DELETE | `/api/departments/:id` | Delete department (admin) |

### Dashboard & Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get aggregated statistics & charts |

### Import/Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/export/:type` | Export data (patients/doctors/bills) to Excel/CSV |
| POST | `/api/reports/import/:type` | Import data from Excel file |

### Files & Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file (images, documents) |

---

## 🌐 Environment Variables

**Server (.env)**
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/medicore
JWT_SECRET=your_strong_jwt_secret_key_here

# Optional: Cloudinary for file uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional: SMTP for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Client (.env)**
```env
VITE_API_URL=https://medicore-main.onrender.com/api
# Or for local:
# VITE_API_URL=http://localhost:5000/api
```

---

## 🏗️ Database Models

### User
Authentication and role-based access control. Three roles: `admin`, `doctor`, `patient`.

### Doctor
Extended profile linked to a User via `user_id`. Contains specialization, experience, fees, schedule, availability.

### Patient
Medical patient record linked to a User via `userId`. Stores demographics, medical info, admission status.

### Appointment
Patient-doctor bookings with date, time, department, status, type, and notes.

### Billing
Invoices linked to patient and doctor. Tracks amount, paid, status, payment method, transaction ID.

### Notification
In-app notifications stored per-user with type, read status, title, message, date.

### Record
Medical records of various types: Diagnosis, Prescription, Lab Report, Imaging, Discharge Summary. Can include attachments.

### Emergency
Urgent patient cases with severity, status, assigned doctor, notes, response time tracking.

### Review
Patient ratings and comments for doctors.

### Department
Hospital departments with name, description, head doctor, fee structure.

---

## 🔐 Authentication & Authorization

- JWT-based stateless authentication
- Password hashing with bcryptjs
- Role-based middleware: `protect` (any authenticated user), `adminOnly` (admin only)
- JWT payload: `{ id, role, name, email, exp }`
- Token sent as: `Authorization: Bearer <token>`

---

## 📱 Frontend Architecture

**React 18 + Vite**
- Fast build times and HMR
- Modern ES6+ syntax

**State Management**
- React Query for server state (cache, mutations, optimistic updates)
- Context API for global state (Auth, Notifications)

**UI Components**
- shadcn/ui for accessible, themeable components
- Tailwind CSS for styling
- Lucide React for icons

**Routing**
- React Router v6 with protected routes

**Animations**
- Framer Motion for page transitions and micro-interactions

**Charts**
- Recharts for dashboard analytics

---

## 🚢 Deployment

**Backend**: Render (Node.js service)  
**Frontend**: Render (Static Site)  
**Database**: MongoDB Atlas (cloud)

**Auto-Deploy:**
1. Push to `main` branch on GitHub
2. Render webhook triggers rebuild
3. Backend rebuilds and restarts
4. Frontend (if changed) rebuilds and deploys

**Live URLs:**
- Frontend: `https://medicore-main-1.onrender.com`
- Backend API: `https://medicore-main.onrender.com/api`

---

## 📄 Key Features in Detail

### Notification System (Fixed)

**Bug Fixed:** Doctor notifications were not appearing due to ID mismatch between Doctor._id and User._id.

**Solution:**
- Notification creation routes accept `doctorId` (Doctor._id), look up Doctor to get `user_id`, and store `userId = doctor.user_id`
- Notification fetching for doctors resolves `req.user._id` (User._id from JWT) back to Doctor's user_id via `Doctor.findOne({ user_id: req.user._id })`
- All doctor-triggered notifications (appointments, emergency assignment, payment received) now correctly deliver to the doctor's notification inbox

**Admin & Patient flows remain unchanged.**

---

### Billing Workflow

1. **Invoice Creation** (`POST /billing`)
   - Triggered by: Doctor creates bill for patient
   - Patient receives: "New Invoice" notification

2. **Payment** (`PUT /billing/:id/pay` or `PUT /billing/:id` with status='Paid')
   - Patient pays through payment UI
   - System marks invoice as Paid
   - Patient receives: "Payment Successful" notification
   - Doctor receives: "Payment Received" notification (with amount and patient name)

---

### Appointment Lifecycle

1. **Patient** books appointment → selects doctor from dropdown (sends `doctorId: Doctor._id`)
2. System calls `createNotification(doctorId, ...)` → looks up Doctor → stores notification with `doctor.user_id`
3. **Doctor** logs in → JWT contains `User._id`
4. Doctor requests `/notifications` → system looks up `Doctor` where `user_id = JWT User._id` → returns matching notifications
5. Doctor sees notification bell update and list of notifications

---

### PDF Report Generation

All PDFs are generated server-side using PDFKit and can be downloaded/printed:

- **Prescription**: Includes patient info, doctor signature, medications table, diagnosis
- **Lab Report**: Test results with units, ranges, doctor's notes
- **Discharge Summary**: Complete hospitalization summary

Accessible from Medical Records page or directly from PDFReports page.

---

## 🧪 Testing

**Manual Testing Checklist:**

- [ ] Admin can login and see all users
- [ ] Doctor can login and see their appointments
- [ ] Patient can book appointment for doctor
- [ ] Doctor receives appointment notification
- [ ] Patient can pay pending bill
- [ ] Doctor receives payment notification
- [ ] Emergency assignment notifies doctor
- [ ] Notifications page shows correct items per role
- [ ] Mark all read works for doctor
- [ ] Clear all works for doctor

---

## 📝 License

MIT License — feel free to use this project for your healthcare facility or as a learning resource.

---

## 🙏 Acknowledgments

- Built with MERN stack (MongoDB, Express, React, Node.js)
- UI powered by **shadcn/ui** and **Tailwind CSS**
- Icons by **Lucide**
- Charts by **Recharts**
- PDF generation with **PDFKit**
- Image upload via **Cloudinary**

---

<div align="center">
  <p>Built with ❤️ using MERN Stack</p>
  <p>© 2026 MediCore Hospital Management System</p>
</div>
#   U p d a t e   t i m e s t a m p :   0 5 / 0 8 / 2 0 2 6   0 2 : 0 3 : 1 7  
 
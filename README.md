# MediCore Hospital Management System

MediCore is a full-stack hospital management system built with React, Express, MongoDB, and Node.js. It provides separate portals for patients, doctors, and admins, with authentication, email OTP verification, appointments, patient records, lab services, billing, emergency cases, reports, notifications, and professional PDF documents.

## Table of Contents
- [Highlights](#highlights)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Demo Accounts](#demo-accounts)
- [Available Scripts](#available-scripts)
- [Authentication Flow](#authentication-flow)
- [Feature Guide](#feature-guide)
  - [Admin](#admin)
  - [Doctor](#doctor)
  - [Patient](#patient)
- [API Overview](#api-overview)
- [Environment Variables](#environment-variables)
- [Reports and Documents](#reports-and-documents)
- [Excel Import](#excel-import)
- [Email Setup Notes](#email-setup-notes)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)

## Highlights

- Role-based dashboards for admin, doctor, and patient users.
- Secure authentication with JWT sessions, password hashing, email OTP verification, blocked-account checks, and forgot-password flow.
- Patient signup with automatic email verification before dashboard access.
- Doctor signup with email verification and admin approval before dashboard access.
- Admin signup and login protected by a secret keyword.
- Patient dashboard with appointments, records, billing, emergency data, and booked lab services.
- Doctor dashboard with appointments, patient records, prescriptions, lab reports, discharge summaries, and email delivery.
- Admin dashboard with patient, doctor, appointment, billing, emergency, report, notification, import, and settings management.
- Professional PDFs for prescriptions, lab reports, discharge summaries, and billing invoices.
- Excel import support for patients, doctors, and billing records using `.xlsx` or `.xls` files.
- Settings for profile, password, notifications, language, theme, density, dashboard preferences, privacy, and calm theme variants.
- Brevo email integration for OTPs and important user, doctor, and admin notifications.
- Cloudinary/local upload support for documents and medical files.

## Tech Stack

### Frontend
- React 18
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- Radix UI components
- Recharts
- Framer Motion
- Lucide icons

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- PDFKit for PDF reports
- XLSX for Excel import
- Multer, Sharp, and Cloudinary for uploads
- Brevo API for email delivery

## Project Structure

```text
mediCore--main/
  client/              React frontend
  server/              Express API and MongoDB models
  DEPLOY.md            Render deployment notes
  package.json         Root scripts for install, dev, seed, and build
  README.md            Project documentation
```

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- Brevo API key for email OTP and notification emails
- Cloudinary account if you want cloud file uploads

## Quick Start

Install dependencies for both apps:

```bash
npm run install:all
```

Create local environment files:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Update `server/.env` for local development:

```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/medicore
JWT_SECRET=change_this_to_a_long_random_secret
ADMIN_SECRET_KEY=medicore2580

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender_email

CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

Update `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

Seed demo data:

```bash
npm run seed
```

Run the frontend and backend together:

```bash
npm run dev
```

Local URLs:
- Frontend: `http://localhost:5173`
- API base: `http://localhost:5001/api`
- Health check: `http://localhost:5001/api/health`

## Demo Accounts

After running `npm run seed`, these users are available:

| Role | Email | Password | Extra login field |
| --- | --- | --- | --- |
| Admin | `admin@mediCore.com` | `password` | Secret keyword: `medicore2580` |
| Doctor | `sarah.smith@mediCore.com` | `password` | None |
| Doctor | `raj.patel@mediCore.com` | `password` | None |
| Patient | `sarah.johnson@email.com` | `password` | None |
| Patient | `mike.chen@email.com` | `password` | None |
| Patient | `patient@mediCore.com` | `password` | None |

If you change `ADMIN_SECRET_KEY` in `server/.env`, use that value instead of `medicore2580`.

## Available Scripts

### Root scripts:
```bash
npm run install:all   # install server and client dependencies
npm run dev           # run Express and Vite together
npm run seed          # reset and seed MongoDB demo data
npm run seed:cluster  # safely upsert demo data into a MongoDB cluster
npm run build         # build the React frontend
```

### Server scripts:
```bash
npm run dev --prefix server
npm run start --prefix server
npm run seed --prefix server
npm run seed:cluster --prefix server
```

### Client scripts:
```bash
npm run dev --prefix client
npm run build --prefix client
npm run lint --prefix client
npm run preview --prefix client
```

## Authentication Flow

### Patient flow:
1. Patient creates an account with name, email, password, phone, gender, and date of birth.
2. The system creates an unverified account and sends a 6-digit OTP by email.
3. The patient verifies the OTP before accessing the patient dashboard.
4. If the patient tries to log in before verification, the system sends a fresh OTP and redirects to the verify-email page.

### Doctor flow:
1. Doctor creates an account with professional details such as specialization, experience, qualification, license number, and consultation fee.
2. The doctor verifies email with OTP.
3. The doctor waits for admin approval.
4. Dashboard access is allowed only after email verification and approval.

### Admin flow:
1. Admin creates an account using the configured secret keyword.
2. Admin verifies email with OTP.
3. Admin login requires email, password, and the secret keyword.
4. Admin dashboard access is allowed only after successful verification.

## Feature Guide

### Admin
- Manage patients, doctors, appointments, billing, reports, and emergencies.
- Approve or reject doctor registrations.
- Block or activate user accounts.
- Import patients, doctors, and billing records from Excel files.
- Generate and email professional prescriptions, lab reports, discharge summaries, and billing invoices.
- Configure profile, password, notifications, language, theme, density, privacy, and dashboard behavior from settings.

### Doctor
- View assigned appointments and patient records.
- Create prescriptions, lab reports, and discharge summaries.
- Send reports to patients by email.
- Review emergency and patient data when assigned.
- Manage personal dashboard settings, notifications, language, and themes.

### Patient
- Book appointments and lab services.
- View booked lab services from the patient dashboard.
- View medical records, prescriptions, lab reports, invoices, and notifications.
- Submit emergency information and track emergency status.
- Manage profile, password, notification, language, privacy, and theme settings.

## API Overview

Base URL: `http://localhost:5001/api`

Protected routes require `Authorization: Bearer <token>`. Admin-only routes
also require an admin account. Public routes include login, registration, OTP
verification, health check, and approved doctor listing.

| Area | Main routes | Purpose |
| --- | --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/me` | Signup, login, OTP verification, password reset, and current user profile. |
| Users | `/users`, `/users/:id/block`, `/users/:id` | Admin user listing, block/unblock, and delete. |
| Doctors | `/doctors`, `/doctors/:id`, `/doctors/:id/approve`, `/doctors/:id/reject`, `/doctors/:id/schedule` | Doctor listing, profiles, approval flow, and schedule updates. |
| Patients | `/patients`, `/patients/:id` | Patient records CRUD. |
| Appointments | `/appointments`, `/appointments/my-appointments`, `/appointments/:id` | Appointment booking, listing, updates, and cancellation. |
| Records | `/records`, `/records/patient/:patientId`, `/records/:id` | Medical records, prescriptions, lab reports, and discharge summaries. |
| Billing | `/billing/services`, `/billing`, `/billing/:id/invoice`, `/billing/:id/pay` | Lab services, invoices, payments, and invoice PDF download. |
| Reports | `/reports/generate-*`, `/reports/email/*`, `/reports/import/*`, `/reports/export/*` | PDF generation, email delivery, Excel import, and exports. |
| Departments | `/departments` | Department listing and admin department management. |
| Payments | `/payments` | Patient payment history and payment records. |
| Uploads | `/upload`, `/upload/download/:fileId`, `/reports/upload/*` | Medical file, image, X-ray, and document uploads. |
| Emergency | `/emergency`, `/emergency/:id/assign`, `/emergency/:id/status`, `/emergency/:id/notes`, `/emergency/stats` | Emergency case creation, assignment, status, notes, and stats. |
| Other | `/dashboard/stats`, `/notifications`, `/reviews`, `/health` | Dashboard data, notifications, reviews, and API health. |

## Environment Variables

### Server variables:
| Variable | Purpose |
| --- | --- |
| `PORT` | Express server port. Local default is `5001`. |
| `NODE_ENV` | Use `development` locally and `production` in deployment. |
| `CLIENT_URL` | Frontend URL allowed by CORS in production. |
| `MONGO_URI` | MongoDB local or Atlas connection string. |
| `JWT_SECRET` | Secret used to sign JWT tokens. Use a strong random value. |
| `ADMIN_SECRET_KEY` | Secret keyword required for admin signup/login. |
| `BREVO_API_KEY` | Brevo API key for sending OTP and notification emails. |
| `BREVO_SENDER_EMAIL` | Verified sender email configured in Brevo. |
| `CLOUDINARY_URL` | Cloudinary connection URL for file uploads. |

### Client variables:
| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend API base URL. Use `http://localhost:5001/api` locally. |

> **Note**: Never commit real `.env` files or production secrets.

## Reports and Documents

MediCore can generate professional PDFs for:
- Prescriptions
- Lab reports
- Discharge summaries
- Billing invoices

Reports can be downloaded from the dashboard and sent by email when Brevo is configured correctly.

## Excel Import

The admin dashboard supports Excel import for:
- Patients
- Doctors
- Billing records

Supported file types:
- `.xlsx`
- `.xls`

## Email Setup Notes

MediCore uses Brevo for OTPs and important notifications. To avoid email errors:
- Use a valid `BREVO_API_KEY`.
- Use a sender address verified in Brevo.
- Keep `BREVO_SENDER_EMAIL` set in `server/.env`.
- Make sure every Brevo send request includes email body content. The app should send either HTML content or text content for each email.

## Deployment

For Render deployment, see `DEPLOY.md`.

Typical deployment setup:
- Deploy the backend as a Node web service.
- Deploy the frontend as a static site.
- Set backend environment variables in the hosting dashboard.
- Set frontend `VITE_API_URL` to the deployed backend URL ending with `/api`.
- Set production `CLIENT_URL` to the deployed frontend URL.
- Run the seed command only when you intentionally want demo data.

## Troubleshooting

### Backend is not reachable:
- Confirm MongoDB is running or `MONGO_URI` is valid.
- Visit `http://localhost:5001/api/health`.
- Check that `VITE_API_URL` points to `http://localhost:5001/api`.

### OTP email is not received:
- Check `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.
- Confirm the sender is verified in Brevo.
- Check the server console for the Brevo API response.

### Admin login fails:
- Include the secret keyword.
- Default local/seed keyword is `medicore2580`.
- If `ADMIN_SECRET_KEY` is changed, use the new value.

### Client shows demo/mock data:
- Start the Express backend.
- Confirm the client can reach `VITE_API_URL`.
- Auth features require the real backend.

## Security Notes

- Replace demo passwords before real use.
- Use a strong `JWT_SECRET` in every non-local environment.
- Change the default admin secret keyword before production.
- Keep production CORS restricted to the deployed frontend URL.
- Do not commit API keys, database passwords, or JWT secrets.
- Review doctor approval and blocked-account flows before production rollout.

## Contributing

We welcome contributions to MediCore! Please follow these guidelines:

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Issue a pull request with a clear description of your changes.

Please note we have a code of conduct, and all contributors are expected to follow it. Please read [the full contributing guidelines](CONTRIBUTING.md) for details.

## License

This project is private and currently does not have an open-source license. All rights are reserved. Please do not distribute or use this code without explicit permission from the project maintainers.

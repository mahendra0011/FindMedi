# Framer Motion → Motion Audit (Phase 0 – Todo 2)

Generated: 2026-09-08 · Source: `client/src` · Tool: `rg -n "framer-motion|from .motion"`

## Summary

- `framer-motion` imports: **46 files** (148 total hit lines including `motion.` usage)
- `motion` imports: **2 files** (`client/src/components/reactbits/BlurText.jsx`, `ScrollVelocity.jsx` — already on `motion/react`)
- `findmedi-next` dependency: `motion@^13.2.0` only — `framer-motion` already dropped (correct per Guiding Decision #4)
- Migration strategy: per-component port during Phase 3/4 (Todo 27) — do not mass-replace now

## Full file list (`from 'framer-motion'`)

| # | File | Import line |
|---|------|-------------|
| 1 | `client/src/components/AIChatAssistant.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 2 | `client/src/components/AppointmentCard.jsx:1` | `import { motion } from 'framer-motion';` |
| 3 | `client/src/components/AppointmentDetailsModal.jsx:1` | `import { motion } from 'framer-motion';` |
| 4 | `client/src/components/BillCheckout.jsx:1` | `import { motion } from 'framer-motion';` |
| 5 | `client/src/components/BookingModal.jsx:7` | `import { motion } from 'framer-motion';` |
| 6 | `client/src/components/CompletedTodayPanel.jsx:5` | `import { motion } from 'framer-motion';` |
| 7 | `client/src/components/DiagnosticCenterCard.jsx:2` | `import { motion } from 'framer-motion';` |
| 8 | `client/src/components/DoctorAnalyticsView.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 9 | `client/src/components/DoctorCard.jsx:3` | `import { motion } from 'framer-motion';` |
| 10 | `client/src/components/DoctorRecordsDashboard.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 11 | `client/src/components/EarningsAnalytics.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 12 | `client/src/components/HospitalCard.jsx:3` | `import { motion } from 'framer-motion';` |
| 13 | `client/src/components/PatientHistoryModal.jsx:2` | `import { motion } from 'framer-motion';` |
| 14 | `client/src/components/PharmacyCard.jsx:2` | `import { motion } from 'framer-motion';` |
| 15 | `client/src/components/TechnicianCard.jsx:2` | `import { motion } from 'framer-motion';` |
| 16 | `client/src/components/TestCard.jsx:1` | `import { motion } from 'framer-motion';` |
| 17 | `client/src/components/TimelineView.jsx:1` | `import { motion } from 'framer-motion';` |
| 18 | `client/src/pages/AllTests.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 19 | `client/src/pages/BuyMedicine.jsx:2` | `import { motion } from 'framer-motion';` |
| 20 | `client/src/pages/ClinicDetail.jsx:3` | `import { motion } from 'framer-motion';` |
| 21 | `client/src/pages/ClinicDoctor.jsx:3` | `import { motion } from 'framer-motion';` |
| 22 | `client/src/pages/ClinicDoctors.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 23 | `client/src/pages/DiagnosticCenterDetail.jsx:2` | `import { motion } from 'framer-motion';` |
| 24 | `client/src/pages/DiagnosticCenters.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 25 | `client/src/pages/DiagnosticDashboard.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 26 | `client/src/pages/DoctorSetup.jsx:3` | `import { motion } from 'framer-motion';` |
| 27 | `client/src/pages/ForgotPassword.jsx:3` | `import { motion } from 'framer-motion';` |
| 28 | `client/src/pages/Home.jsx:2` | `import { motion, useScroll } from "framer-motion";` |
| 29 | `client/src/pages/HospitalDirectory.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 30 | `client/src/pages/HospitalDoctor.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 31 | `client/src/pages/HospitalDoctors.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 32 | `client/src/pages/HospitalProfile.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 33 | `client/src/pages/HospitalTestBooking.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 34 | `client/src/pages/ImagingCenterDetail.jsx:2` | `import { motion } from 'framer-motion';` |
| 35 | `client/src/pages/JoinPlatform.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 36 | `client/src/pages/Login.jsx:3` | `import { motion } from 'framer-motion';` |
| 37 | `client/src/pages/MedicineStoreDetail.jsx:2` | `import { motion } from 'framer-motion';` |
| 38 | `client/src/pages/Notifications.jsx:2` | `import { motion } from 'framer-motion';` |
| 39 | `client/src/pages/NursingCharts.jsx:3` | `import { motion } from 'framer-motion';` |
| 40 | `client/src/pages/OTPVerification.jsx:3` | `import { motion } from 'framer-motion';` |
| 41 | `client/src/pages/Patients.jsx:3` | `import { motion } from 'framer-motion';` |
| 42 | `client/src/pages/PendingApproval.jsx:3` | `import { motion } from 'framer-motion';` |
| 43 | `client/src/pages/Pharmacy.jsx:2` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 44 | `client/src/pages/Signup.jsx:3` | `import { motion, AnimatePresence } from 'framer-motion';` |
| 45 | `client/src/pages/TechnicianDetail.jsx:3` | `import { motion } from 'framer-motion';` |
| 46 | `client/src/pages/VerifyTransaction.jsx:2` | `import { motion } from 'framer-motion';` |
| — | `client/src/components/reactbits/BlurText.jsx:1` | `import { motion } from "motion/react";` (already migrated) |
| — | `client/src/components/reactbits/ScrollVelocity.jsx:10` | `from "motion/react"` (already migrated) |

## API differences to handle per-file (Todo 27)

- `framer-motion` → `motion`: `import { motion, AnimatePresence } from 'motion'` (or `'motion/react'` for React-specific hooks). `useScroll` stays available in `motion`.
- No breaking change for `motion.div`, `AnimatePresence` props in these files — mechanical rename. Verify `whileInView`/`viewport` variants still work (they do in motion v12+).
- Keep GSAP interop: files using both `motion` + `gsap` (e.g. `Home.jsx` via reactbits) need no conflict — they operate on different DOM nodes.

## Recommendation

Do not run codemod now. Tick off per file as you migrate that page/component to `.tsx` in Phase 3/4, so types are added at same time.

# Privacy Policy alignment with actual data flows (draft)

## Data flows to verify
- Patient profile, family members, vitals, records, prescriptions, orders, bookings.
- Provider listings, documents, payouts, availability.
- Analytics: PHI-free events only (analyticsEvents.js allowlist).
- Notifications: discreet variants for sensitive categories.
- Search: taxonomy + conditions/procedures + Hinglish symptoms (no PHI).

## Vendors to list
- Cloudflare (CDN/WAF), payment gateway (Razorpay/Stripe), SMS/WhatsApp (DLT), Sentry (crash), PostHog (analytics, if used), LiveKit (video), S3/MinIO (storage).

## Retention
- Ride location: 7 days (locationPurge job).
- Join drafts: 30 days idle -> expired, 60 days -> purged.
- Documents: expiry-based (documentExpiry job).
- Audit logs: per retention policy (docs/privacy/RETENTION.md).

## DPIA
- See docs/privacy/DPIA.md. Update vendor list and data flows on each new integration.

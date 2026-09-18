# Migrations

One-off data migrations. Run manually with `node scripts/<file>` from `server/`. Each is idempotent where noted.

| File | When to run |
| ---- | ----------- |
| `migrate-multihospital.js` (moved from `server/` root 2026-09-18) | Once per database when introducing multi-hospital support: creates the default "FindMedi Demo Hospital" and backfills `hospitalId` on all hospital-scoped collections + `hospital_admin` users. Safe to re-run (only touches docs missing `hospitalId`). |
| `migrate-appointment-date-to-string.mjs` | Once: converts legacy `Date`-type `appointments.date` values to IST date strings. |
| `migrate-appointment-index.mjs` | Once: rebuilds appointment indexes after the date-type change. |
| `migrate-index.mongosh.js` | Once, via `mongosh`: index fixes that must run in the shell. |
| `backfill-appointment-completion-time.mjs` | Once: backfills `completionTime` on historical appointments. |
| `fix-payment-index.mjs` | Once (or after index drift): drops the stale `referenceId_1_status_1` index so Mongoose recreates it. |
| `clear-appointments.mjs` | DANGER — deletes all appointments/tokens/appointment-payments. Dev/test reset only, never production. |

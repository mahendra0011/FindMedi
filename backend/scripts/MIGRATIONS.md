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
| `migrate-enum-normalization.mjs` | Once after the subcatogary.md A1/A2 enum work: merges `Medicine.category` `Vitamin` -> `Vitamins` and rewrites the legacy `appointmentModes` aliases (`home` -> `home_visit`, `voice`/`call` -> `audio`) on hospitals, facilities and doctors. The enums keep the old values, so it can be skipped safely and re-run whenever legacy rows reappear. |
| `seed-test-categories.mjs` | Seeds canonical test categories into `Category` collection under `type: 'test'` (subcatogary.md §4.1). Idempotent. |
| `migrate-test-categories.mjs` | Backfills `Test.categoryCode` on all existing test documents from `category` name/alias (subcatogary.md §4.1). Idempotent. |
| `migrate-bed-unique.js` | Dry-run first compound index migration for Bed: converts legacy global `bedNumber_1` to compound `(hospitalId, bedNumber)` unique index. Default run is non-destructive dry-run (`node scripts/migrate-bed-unique.js`). Apply with `--apply`. |
| `backfill-encounters.mjs` | Backfills canonical `Encounter` records and links `LabOrder.encounterId` and `PharmacyOrder.encounterId`. Supports `--dry-run` and `--apply`. Safe to re-run. |
| `migrate-encrypt-phi.mjs` | Encrypts legacy unencrypted PHI/PII fields at rest using AES-256-GCM application-layer encryption (`FIELD_ENCRYPTION_KEY`). Supports `--dry-run` to preview counts and `--apply` with batch progression. |
| `migrate-category-taxonomy.mjs` | Re-aligns store and lab items against canonical taxonomy codes. Supports `--dry-run` and `--apply`. |
| `purge-shared-key-docs.mjs` | Removes orphaned records created with shared demonstration keys prior to tenant isolation enforcement. |


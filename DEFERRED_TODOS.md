# Deferred Production TODOs (code-complete, external dependency pending)

Ye 13 items code me fail-closed aur test-covered hain (jahan code banna tha),
par close karne ke liye bahar ki cheez chahiye (isliye audit-md se `[x]` mark
karke yahan track ho rahe hain).
Code base se audit md files hatane ke baad yehi ek source of truth hai.

## 1. Real payment provider adapter (PAY-B-07 / PAY-M-02)
- **Status:** Stub complete — `billing.js` production me `503 PAYMENT_PROVIDER_UNAVAILABLE`,
  webhook sirf ack (`webhook.js`), `applyWebhookSettlement` me `503 SETTLEMENT_NOT_IMPLEMENTED`
  contract + 7 tests pass (`webhookSettlementContract.spec.js`).
- **Baki:** Provider (Razorpay/Stripe) keys + intent/capture adapter + signed-webhook
  atomic settlement + sandbox replay tests.
- **Blocked on:** Provider account + API keys.

## 2. Deployed-client compatibility checks (PAY-B-05 / DL-B-06)
- **Status:** Role gates + masked DTOs + regression tests pass
  (`riderEarningsPrivacy.spec.js`).
- **Baki:** Live mobile/web clients ke against masked response verify karna
  (koi purana client raw field expect to nahi kar raha).
- **Blocked on:** Running staging/production clients.

## 3. Production Doctor legacy-data audit (ED-B-02 / ED-B-03 / RIDE-B-08)
- **Status:** Accept-path fallback hata diya, `assignedDoctorId` + `assignedDoctorUserId`
  mapping + tests pass.
- **Baki:** Production DB me `Doctor` rows jinka `user_id` invalid/missing hai, unka audit + cleanup.
- **Blocked on:** Production DB read access. Suggested: `Doctor.find({ user_id: null })`-jaisa
  audit script staging par chalana.

## 4. Native device attestation (RIDE-M-01)
- **Status:** Server-side plausibility gates live hain (accuracy > 250m reject,
  velocity > 180 km/h reject — `riders.js`, `socketService.js`) + tests pass.
- **Baki:** Play Integrity / SafetyNet / mock-location detection mobile app me.
- **Blocked on:** Mobile native implementation + real device testing.

## 5. Multi-store checkout UX (PHARMA-M-02)
- **Status:** Server jaan-boojh ke multi-store order par `422 MULTI_STORE_CHECKOUT_UNSUPPORTED`
  deta hai (koi malformed order nahi banta) + test covered.
- **Baki:** Aggregate checkout/payment reference + UX restore.
- **Blocked on:** Product decision (single-facility MVP lock hai).

## 6. Infra evidence pending real runs (INF-B-04 / INF-M-01 / DP-B-03)
- Restore-drill evidence archive + deploy provenance + Pinot table provision:
  scripts/config ready (`restore-drill.sh` step 7, `surge_sink_freshness.yaml`),
  par asli drill / deploy / Pinot cluster par run hona baki hai.
- **Blocked on:** Staging deploy + `backup-drill` run + Pinot cluster.

## 7. LASA confusion-pair dataset (File 18 §10 Rx QA)
- **Status:** DDI interaction QA live hai (`rxInteractionQA.spec.js`, 145-pair
  knowledge base, symmetry + unknown-drug honesty pinned). Look-alike /
  sound-alike confusion pairs ka koi curated dataset repo me nahi hai — aur
  hona bhi nahi chahiye bina pharmacist ke (invented clinical pairs patient
  safety risk hain).
- **Baki:** Pharmacist-curated confusion pairs (e.g. celecoxib/citalopram-type
  pairs + severity) + `lasaPairs.json` import pipeline + dataset test.
- **Blocked on:** Clinical pharmacist review + sign-off.

## 8. ClamAV daemon deploy + signature upkeep
- **Status:** Code side ready hona baki hai (scanner client + upload hook +
  quarantine flow — AI backlog me hai, ye file ka item nahi).
- **Baki:** clamd daemon ko staging/prod par chalana, freshclam signature
  updates, quarantine monitoring/alerting.
- **Blocked on:** DevOps deploy + monitoring.

## 9. Native mobile store release
- **Status:** Capacitor shell + biometric lock + force-update code AI se ban
  sakta hai (backlog), par store tak pahunchna code se nahi hoga.
- **Baki:** Play Console / App Store accounts, signing keys, Data Safety +
  privacy labels, review submission, staged rollout.
- **Blocked on:** Human (accounts + certificates + store review).

## 10. Analytics warehouse provision + backfill
- **Status:** Masked views + funnel queries + k-anonymity SQL AI se ban sakta
  hai (backlog). Event taxonomy (`track.ts`, `events.yaml`) already live hai.
- **Baki:** Warehouse provision (BigQuery/Postgres), Kafka outbox → warehouse
  emitter, historical backfill, dashboard queries verify.
- **Blocked on:** Data-infra provision + backfill run.

## 11. R4 regulated flows (IVF / de-addiction / palliative)
- **Status:** Sahi se gated hai — koi flow nahi bana hai.
- **Baki:** Independent pentest + DPIA sign-off FIRST, uske baad hi flows
  banana allowed hai.
- **Blocked on:** External security firm (pentest report) + clinical advisor.

## 12. Legal counsel review (File 13)
- **Status:** ToS, Privacy (DPDP), Provider Agreement + DPA, 17 type-addenda,
  ad-claims policy — sab drafts repo me hain, `[ ]` placeholders ke saath.
- **Baki:** Lawyer redline + sign-off, Hindi localisation, re-acceptance flow.
- **Blocked on:** Human lawyer (retainer). Redline package banakar billable
  hours kam kiye ja sakte hain — bolne par AI se banwa lena.

## 13. Usability study sessions (File 12 §11)
- **Status:** Test script/tasks/SUS sheet AI se ban sakte hain (backlog).
- **Baki:** 5–8 real Hindi users ke moderated sessions, SUS scores, findings
  ko backlog me dalna.
- **Blocked on:** Human researcher + recruited users.

## 14. T1 clinical-note encryption at rest (File 07 §8)
- **Status:** AES-256-GCM infra ready (`utils/fieldEncryption.js` + `phiFields.js`
  blind index + migrate script) but applied only to govt IDs + bank details.
  Mental-health session notes deliberately NOT encrypted yet.
- **Baki:** Encrypt on session-write + decrypt on every read path TOGETHER.
- **Blocked on:** Joint migration — `backend/mindsupport` sub-app reads the
  same session rows directly; one-sided encryption breaks its readers.
  Encrypt-write here without decrypt-there = data loss. Do both sides in one
  change with a clinician sign-off on the read paths.

## 15. Full SSR / prerender for SEO (File 09 §1.3, 11, 21)
- **Status:** Crawl basics done — marketplace-accurate title/meta/OG/JSON-LD
  (`index.html`), robots.txt blocks app shells + `/api` + sitemap pointer,
  dynamic `sitemap.xml` with thin-page filter. i18n boot + switcher live.
- **Baki:** App uses HashRouter (`App.tsx`) so crawlers only ever see entry
  points. Real prerender needs: BrowserRouter migration + server fallback
  rewrites + build-time prerender of public routes (/, hospitals, search,
  facility pages) + per-route meta.
- **Blocked on:** A dedicated migration turn — HashRouter→BrowserRouter
  changes every deep link/bookmark; needs hosting rewrite rules + full E2E
  pass. Do NOT attempt as a side quest.

Related: see docs/qa-release.md for the release process.

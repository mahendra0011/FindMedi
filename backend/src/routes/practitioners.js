import express from 'express';
import { providerDetail } from './providers.js';

// 10.md 4.1 `GET /api/practitioners/:slug` — the practitioner spelling of the
// provider detail DTO. Its own FILE (not a second router in providers.js)
// because the authz inventory (scripts/lib/routeScan.mjs) recognises only the
// identifier `router.<method>(`: a `practitionerRouter.get(...)` line would be
// scanned as nothing at all, and an invisible surface is an un-audited one.
// The handler itself is imported, so DETAIL_FIELDS stays single-sourced.
const router = express.Router();

// authz: public
router.get('/:slug', providerDetail('practitioner'));

export default router;

import express from 'express';
import ProviderTypeConfig from '../models/ProviderTypeConfig.js';
import { safeSearchRegex } from '../utils/escapeRegex.js';

const router = express.Router();

// Join-wizard config DTO (10.md 4.1 `GET /api/config/provider-types?city=`).
// commissionDefaults and allowedStatus are operator economics/internal workflow
// and never leave the admin router.
const PUBLIC_FIELDS = 'typeKey kind group tier label icon description steps fields requiredDocs optionalDocs agreementTemplateId approvalPolicy.slaHours version';

// authz: public
//
// The wizard needs this before the applicant has an account, so it is public —
// but it only ever returns ACTIVE configs: a type that was turned off must stop
// offering itself to new joiners immediately.
router.get('/', async (req, res) => {
  try {
    const { city, kind, group } = req.query;
    const filter = { isActive: true };
    if (kind) filter.kind = String(kind).slice(0, 40);
    if (group) filter.group = String(group).slice(0, 40);
    if (city) {
      const cityRe = safeSearchRegex(city, { max: 80, flags: 'i' });
      if (cityRe) {
        // An empty enabledCities list means "available in every city".
        filter.$or = [{ enabledCities: { $size: 0 } }, { enabledCities: cityRe }];
      }
    }

    const configs = await ProviderTypeConfig.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ group: 1, label: 1 })
      .lean();

    res.set('Cache-Control', 'public, max-age=300');
    res.removeHeader('Pragma');
    return res.json({ providerTypes: configs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;

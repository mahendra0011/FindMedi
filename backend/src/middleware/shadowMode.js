/**
 * Shadow-mode enforcement (file 23: "Shadow mode -> staged enforcement
 * (mental health first) -> remove dead pages").
 *
 * A shadow gate wraps a check that MAY deny a request. In shadow mode
 * (default) a failing check is logged as `shadow_violation` and the request
 * is ALLOWED, so regressions surface in audit without breaking users. In
 * enforce mode (SHADOW_ENFORCE=true or feature flag `shadow_enforce`) a
 * failing check returns 403. Staged rollout: flip enforce per module via
 * SHADOW_ENFORCE_MODULES (comma list) while leaving others in shadow.
 */
import { auditLog } from './audit.js';
import { isFeatureEnabled } from '../services/featureFlags.js';

const enforceGlobally = () => process.env.SHADOW_ENFORCE === 'true' || isFeatureEnabled('shadow_enforce');

const enforcedModules = () => (process.env.SHADOW_ENFORCE_MODULES || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export const shadowGate = (moduleName, check) => async (req, res, next) => {
  try {
    const ok = await check(req);
    if (ok) return next();
    const moduleKey = String(moduleName || '').toLowerCase();
    const enforce = enforceGlobally() || enforcedModules().includes(moduleKey);
    await auditLog('shadow_violation', req.user || {}, {
      module: moduleKey,
      path: req.originalUrl,
      method: req.method,
      mode: enforce ? 'enforce' : 'shadow',
      ip: req.ip,
    });
    if (enforce) {
      return res.status(403).json({ message: 'Access denied by shadow policy', code: 'SHADOW_DENIED', module: moduleKey });
    }
    return next();
  } catch {
    // Fail open in shadow mode; fail closed only when enforcing.
    if (enforceGlobally()) return res.status(500).json({ message: 'Shadow gate error' });
    return next();
  }
};

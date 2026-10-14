// 2.md 6 / 2.md 11 / onboarding anti-fraud — submit-time automatic checks.
//
// Every submit (and resubmit) of a join application runs this screen BEFORE the
// row enters the review queue, and the result is stored on the application so
// the reviewer opens the queue already knowing what to look at:
//
//   duplicate_pan / duplicate_gstin  — same tax identity on another applicant
//                                      (severity `conflict`: different owner,
//                                      forces two-person approval);
//   duplicate_name                   — same display name (and city, when known)
//                                      on another application or live listing
//                                      (severity `review`: could be a branch,
//                                      could be a copy — a human decides);
//   disposable_email                 — throwaway inbox domain;
//   voip_phone                       — phone outside the normal mobile pattern
//                                      (heuristic; live VOIP ranges are a
//                                      gateway concern, this catches the
//                                      obviously-fake shapes);
//   payout_name_match                — penny-drop credited-name comparison;
//   gstin_pan_match                  — GSTIN format/checksum (lib/gstin.js) and
//                                      the PAN embedded in a GSTIN vs the
//                                      declared PAN (review, never conflict:
//                                      a company GSTIN legitimately carries the
//                                      corporate PAN, not the director's);
//   duplicate_reg                    — the same registration number already on
//                                      an in-flight application, flagged harder
//                                      when it sits under a DIFFERENT name;
//   ip_cluster                       — other in-flight applications from the
//                                      same submit network (hash-only);
//   pin_location_match               — the PIN's postal circle vs the state in
//                                      the address text.
//
// Design rules this file follows:
//   * FAIL-SOFT. A query that throws becomes an `error` check, never a 500 on
//     the applicant's submit — the verdict degrades to `error` and the reviewer
//     sees the checks did not run.
//   * NOTHING here blocks a submission. It annotates it: `verdict` + flags the
//     reviewer queue can filter on, and `forceTwoPerson` tightens the approval
//     rule when the same tax identity shows up twice.
//   * All matching runs through normalizers/regex helpers (escapeRegex), so a
//     name like "A+B Clinic" cannot become a match-everything pattern.

import { createHash } from 'node:crypto';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import ProviderApplication from '../models/ProviderApplication.js';
import { safeSearchRegex, capSearch, escapeRegex } from '../utils/escapeRegex.js';
import { verifyPennyDrop, evaluateNameMatch } from './pennyDrop.js';
import { validateGstin } from './gstin.js';
import { decryptJoinDraftStep, joinPhiIndex } from '../utils/phiFields.js';

export const AUTO_CHECK_KEYS = [
  'duplicate_pan', 'duplicate_gstin', 'duplicate_reg', 'gstin_pan_match',
  'ip_cluster', 'duplicate_name',
  'disposable_email', 'voip_phone', 'payout_name_match', 'pin_location_match',
];

/** Applications that are still "in play" for a duplicate to matter. A rejected
 *  or expired twin proves nothing — the previous attempt already failed. */
const DUP_APP_STATUSES = ['needs_info', 'submitted', 'resubmitted', 'under_review', 'approved'];
/** Listings worth duplicate-checking against (a draft listing proves nothing). */
const DUP_PROVIDER_STATUSES = { $nin: ['draft', 'rejected', 'archived'] };

/** Domains that exist to receive mail nobody reads. Kept deliberately short and
 *  obvious — a false positive here is a reviewer note, never a rejection. */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', '10minutemail.com',
  'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
  'getnada.com', 'maildrop.cc', 'discard.email', 'throwawaymail.com', 'fakeinbox.com',
  'tmpmail.net', 'tempr.email',
]);

export function isDisposableEmail(email) {
  const domain = String(email ?? '').toLowerCase().split('@')[1] ?? '';
  return domain !== '' && DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/** Normalized PAN/GSTIN comparison: uppercase, alphanumeric only, right shape. */
export function normalizeTaxId(raw, length) {
  const value = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return value.length === length ? value : '';
}

/** Phone heuristic. A number that is not a plausible mobile/landline shape is
 *  flagged for a human VOIP/genuinity look rather than silently accepted. */
export function looksVoip(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return true;
  if (/^(\d)\1+$/.test(digits)) return true; // 9999999999, 0000000000...
  return false;
}

/** Text out of a wizard field: strings pass through, `{value,label}` wrappers
 *  unwrap, everything else (arrays/numbers) is stringified only when scalar. */
function pickText(value) {
  if (typeof value === 'string') return capSearch(value, 160);
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of ['value', 'text', 'label', 'name']) {
      if (typeof value[k] === 'string') return capSearch(value[k], 160);
    }
  }
  return '';
}

/** First non-empty value for each key across every wizard step. */
function collectValues(stepData, keys) {
  const out = {};
  for (const data of Object.values(stepData ?? {})) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
    for (const key of keys) {
      if (out[key] !== undefined) continue;
      const v = data[key];
      if (v !== undefined && v !== null && v !== '') out[key] = v;
    }
  }
  return out;
}

// ── pin-location: PIN circle (first 2 digits) → states it may legitimately
// carry. City-level matching would need an offline PIN→city dataset we do not
// ship; the circle→state binding is public, tiny and locally checkable, so the
// check compares STATE. Fuzzy borders (Goa under 403, Uttarakhand under 24/25,
// NE under 90–94) are widened on purpose — the check only fires when the
// address names a state that is NOT in the circle at all. Prefixes we cannot
// vouch for (78/79 NE interiors, Army 96–99) are simply absent → skip.
const PIN_CIRCLES = (() => {
  const map = {};
  const put = (prefixes, states) => { for (const p of prefixes) map[p] = states; };
  put(['11'], ['Delhi']);
  put(['12', '13'], ['Haryana']);
  put(['14', '15', '16'], ['Punjab', 'Chandigarh']);
  put(['17'], ['Himachal Pradesh']);
  put(['18', '19'], ['Jammu and Kashmir', 'Jammu & Kashmir', 'Ladakh']);
  put(['20', '21', '22', '23', '24', '25', '26', '27', '28'], ['Uttar Pradesh', 'Uttarakhand', 'Uttaranchal']);
  put(['30', '31', '32', '33', '34'], ['Rajasthan']);
  put(['36', '37', '38', '39'], ['Gujarat', 'Dadra and Nagar Haveli', 'Daman and Diu']);
  put(['40'], ['Maharashtra', 'Goa']);
  put(['41', '42', '43', '44'], ['Maharashtra']);
  put(['45', '46', '47', '48'], ['Madhya Pradesh']);
  put(['49'], ['Chhattisgarh']);
  put(['50', '51'], ['Telangana', 'Andhra Pradesh']);
  put(['52', '53'], ['Andhra Pradesh', 'Telangana']);
  put(['56', '57', '58', '59'], ['Karnataka']);
  put(['60', '61', '62', '63', '64'], ['Tamil Nadu', 'Puducherry', 'Pondicherry']);
  put(['67', '68', '69'], ['Kerala', 'Lakshadweep']);
  put(['70', '71', '72', '73', '74'], ['West Bengal', 'Andaman and Nicobar Islands']);
  put(['75', '76', '77'], ['Odisha', 'Orissa', 'West Bengal']);
  put(['80', '81', '82', '83', '84', '85'], ['Bihar', 'Jharkhand']);
  put(['86'], ['Jharkhand', 'Bihar']);
  put(['90', '91', '92', '93', '94'], ['Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Tripura', 'Arunachal Pradesh']);
  return map;
})();

/** Every state spelling the circles accept, longest first so "Andaman and
 *  Nicobar Islands" is found before any shorter substring could match. */
const STATE_SPELLINGS = (() => {
  const set = new Set();
  for (const states of Object.values(PIN_CIRCLES)) for (const s of states) set.add(s);
  return [...set].sort((a, b) => b.length - a.length);
})();

/** First canonical state name that appears in free text (case-insensitive). */
export function findStateName(text) {
  const hay = String(text ?? '');
  if (!hay) return '';
  for (const name of STATE_SPELLINGS) {
    if (new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(hay)) return name;
  }
  return '';
}

/** City + state + pincode out of whatever shape the location step was saved
 *  in. The wizard stores the address as ONE free string ("…, City, State
 *  110001"), so state detection runs over the text; object shapes may carry
 *  discrete keys (and an `address` string inside them). */
function extractPlace(stepData) {
  const raw = collectValues(stepData, ['address'])['address'];
  let city = '';
  let state = '';
  let blob = '';
  if (typeof raw === 'string') {
    blob = raw;
    state = findStateName(raw);
  } else if (raw && typeof raw === 'object') {
    city = pickText(raw.city || raw.town || raw.district || '');
    state = pickText(raw.state || '');
    if (typeof raw.address === 'string') state = state || findStateName(raw.address);
    blob = JSON.stringify(raw);
  }
  const pin = blob.match(/\b[1-9][0-9]{5}\b/);
  return { city: city.toLowerCase(), state, pincode: pin ? pin[0] : '' };
}

/** Truncated SHA-256 of the submit IP: the ip_cluster check needs equality
 *  only, and the raw address already lives in the audit row — so the long-lived
 *  application document keeps no new PII. Empty input → null (check skips). */
export function hashIp(ip) {
  const raw = String(ip ?? '').trim();
  if (!raw) return null;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

const check = (key, status, severity, note) => ({ key, status, severity, note: String(note ?? '').slice(0, 500) });

const OWN_TAX = (rows, field, value) => rows.filter((row) => String(row[field] ?? '') === value);

// autoChecks is a stored document the queue renders — a check note must not
// re-print a tax ID that field encryption is hiding elsewhere on the row.
// First 5 + stars + last 1 keeps it recognisable against the document.
const maskTax = (v) => {
  const s = String(v ?? '');
  if (s.length <= 6) return '****';
  return `${s.slice(0, 5)}${'*'.repeat(s.length - 6)}${s.slice(-1)}`;
};

/**
 * Run the whole screen. Returns the object stored as `application.autoChecks`:
 *   { verdict, runAt, forceTwoPerson, checks[] }
 * Never throws.
 */
export async function runAutoChecks({ application } = {}) {
  const runAt = new Date();
  const checks = [];
  // P2-9: draft tax/bank fields are encrypted at rest (utils/phiFields.js);
  // this copy is decrypted IN MEMORY for the screen and never saved. Legacy
  // plaintext rows pass through decrypt untouched, so both generations run.
  const stepData = decryptJoinDraftStep(application?.draft?.stepData ?? {});
  const applicantId = String(application?.applicantUserId ?? '');
  const selfId = String(application?._id ?? '');

  const dupFilter = { _id: { $ne: selfId }, status: { $in: DUP_APP_STATUSES } };
  const ids = collectValues(stepData, [
    'pan', 'gstin', 'display_name', 'legal_name', 'account_holder', 'account_number', 'ifsc',
    'registration_number',
  ]);
  const pan = normalizeTaxId(ids.pan, 10);
  const gstin = normalizeTaxId(ids.gstin, 15);
  const name = pickText(ids.display_name || ids.legal_name);
  const place = extractPlace(stepData);

  // ── duplicate PAN / GSTIN (one query serves both) ────────────────────────
  // Encrypted rows are matched through their blind indexes (application
  // .phiIndexes, keyed HMAC — see utils/phiFields.joinPhiIndex), legacy
  // plaintext rows through the value itself: $or covers both generations.
  const taxClauses = [];
  const panIdx = pan ? joinPhiIndex('pan', pan) : null;
  const gstinIdx = gstin ? joinPhiIndex('gstin', gstin) : null;
  if (pan) {
    taxClauses.push({ 'draft.stepData.pan': pan });
    if (panIdx) taxClauses.push({ 'phiIndexes.pan': panIdx });
  }
  if (gstin) {
    taxClauses.push({ 'draft.stepData.gstin': gstin });
    if (gstinIdx) taxClauses.push({ 'phiIndexes.gstin': gstinIdx });
  }
  if (taxClauses.length > 0) {
    try {
      const rows = await ProviderApplication
        .find({ $and: [dupFilter, { $or: taxClauses }] })
        .select('applicationId status applicantUserId draft.stepData phiIndexes')
        .limit(10)
        .lean();
      const norm = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

      if (pan) {
        const hits = rows.filter((row) => norm(row.draft?.stepData?.pan) === pan || row.phiIndexes?.pan === panIdx);
        const foreign = hits.filter((row) => String(row.applicantUserId) !== applicantId);
        checks.push(foreign.length > 0
          ? check('duplicate_pan', 'flag', 'conflict', `PAN already used by ${foreign[0].applicationId} (different applicant)`)
          : check('duplicate_pan', 'pass', 'info', hits.length > 0 ? 'PAN matches your own application' : 'PAN not seen before'));
      } else {
        checks.push(check('duplicate_pan', 'skip', 'info', 'no PAN supplied'));
      }

      if (gstin) {
        const hits = rows.filter((row) => norm(row.draft?.stepData?.gstin) === gstin || row.phiIndexes?.gstin === gstinIdx);
        const foreign = hits.filter((row) => String(row.applicantUserId) !== applicantId);
        checks.push(foreign.length > 0
          ? check('duplicate_gstin', 'flag', 'conflict', `GSTIN already used by ${foreign[0].applicationId} (different applicant)`)
          : check('duplicate_gstin', 'pass', 'info', hits.length > 0 ? 'GSTIN matches your own application' : 'GSTIN not seen before'));
      } else {
        checks.push(check('duplicate_gstin', 'skip', 'info', 'no GSTIN supplied'));
      }
    } catch (err) {
      checks.push(check('duplicate_pan', 'error', 'review', `tax duplicate scan failed: ${err.message}`));
      checks.push(check('duplicate_gstin', 'error', 'review', 'tax duplicate scan failed'));
    }
  } else {
    checks.push(check('duplicate_pan', 'skip', 'info', 'no PAN supplied'));
    checks.push(check('duplicate_gstin', 'skip', 'info', 'no GSTIN supplied'));
  }

  // ── GSTIN integrity & PAN binding (reg ↔ identity) ───────────────────────
  // Review severity on purpose: a company's GSTIN legitimately carries the
  // CORPORATE PAN while the applicant types their personal one — that is a
  // document to re-read, not a duplicate identity to force two-person over.
  if (gstin) {
    const shape = validateGstin(ids.gstin);
    if (!shape.valid) {
      checks.push(check('gstin_pan_match', 'flag', 'review',
        `GSTIN fails validation (${shape.reason}) — likely a typo or a fabricated number`));
    } else if (pan && shape.gstin.slice(2, 12) !== pan) {
      checks.push(check('gstin_pan_match', 'flag', 'review',
        `GSTIN is issued against PAN ${maskTax(shape.gstin.slice(2, 12))} but ${maskTax(pan)} was declared — verify whose GSTIN this is`));
    } else {
      checks.push(check('gstin_pan_match', 'pass', 'info',
        pan ? 'GSTIN checksum valid and matches the declared PAN' : 'GSTIN checksum valid (no PAN to compare)'));
    }
  } else {
    checks.push(check('gstin_pan_match', 'skip', 'info', 'no GSTIN supplied'));
  }

  // ── duplicate registration number, with the name in view ─────────────────
  // Query-then-normalize (same limitation as the tax scan: a punctuation
  // variant of the stored value will not be fetched), then the NAME decides
  // the wording — same number under a different name is the interesting shape.
  const regNorm = String(ids.registration_number ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (regNorm.length >= 4) {
    const regIdx = joinPhiIndex('registration_number', regNorm);
    try {
      const rows = await ProviderApplication
        .find({
          $and: [dupFilter,
            { $or: [
              { 'draft.stepData.registration_number': new RegExp(escapeRegex(String(ids.registration_number).trim()), 'i') },
              // encrypted rows: the keyed blind index, never the ciphertext
              ...(regIdx ? [{ 'phiIndexes.registration_number': regIdx }] : []),
            ] }],
        })
        .select('applicationId applicantUserId draft.stepData phiIndexes')
        .limit(10)
        .lean();
      const normReg = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const hits = rows.filter((row) => normReg(row.draft?.stepData?.registration_number) === regNorm
        || row.phiIndexes?.registration_number === regIdx);
      const foreign = hits.filter((row) => String(row.applicantUserId) !== applicantId);
      if (foreign.length > 0) {
        const ref = foreign[0].applicationId || '';
        const theirName = pickText(foreign[0].draft?.stepData?.display_name || foreign[0].draft?.stepData?.legal_name);
        const nameDiffers = Boolean(name && theirName && theirName.toLowerCase() !== name.toLowerCase());
        checks.push(check('duplicate_reg', 'flag', 'review',
          `registration number already on ${ref} (different applicant${nameDiffers ? ', under a different name' : ''})`));
      } else if (hits.length > 0) {
        checks.push(check('duplicate_reg', 'pass', 'info', 'registration number matches your own application'));
      } else {
        checks.push(check('duplicate_reg', 'pass', 'info', 'registration number not seen before'));
      }
    } catch (err) {
      checks.push(check('duplicate_reg', 'error', 'review', `registration duplicate scan failed: ${err.message}`));
    }
  } else {
    checks.push(check('duplicate_reg', 'skip', 'info', 'no registration number supplied'));
  }

  // ── submit-network cluster (hash equality only; no raw IP on the row) ────
  // set by routes/join.js at submit via hashIp(). A shared office/NAT is
  // completely normal, so this can only ever reach `review` — it is a prompt
  // to weigh the rest of the profile, never a conflict on its own.
  const ipHash = String(application?.submitIpHash ?? '');
  if (ipHash) {
    try {
      const rows = await ProviderApplication
        .find({ $and: [dupFilter, { submitIpHash: ipHash }] })
        .select('applicationId applicantUserId')
        .limit(10)
        .lean();
      const foreign = rows.filter((row) => String(row.applicantUserId) !== applicantId);
      if (foreign.length > 0) {
        checks.push(check('ip_cluster', 'flag', 'review',
          `${foreign.length} other in-flight application${foreign.length === 1 ? '' : 's'} from the same submit network (shared office/NAT is common — weigh the rest of the profile)`));
      } else {
        checks.push(check('ip_cluster', 'pass', 'info', 'no other in-flight application from this network'));
      }
    } catch (err) {
      checks.push(check('ip_cluster', 'error', 'review', `IP cluster scan failed: ${err.message}`));
    }
  } else {
    checks.push(check('ip_cluster', 'skip', 'info', 'no submit IP captured'));
  }

  // ── duplicate name (applications + live listings) ────────────────────────
  if (name) {
    try {
      const rx = safeSearchRegex(name);
      const [appRows, providers] = await Promise.all([
        ProviderApplication
          .find({ $and: [dupFilter, { $or: [{ 'draft.stepData.display_name': rx }, { 'draft.stepData.legal_name': rx }] }] })
          .select('applicationId status applicantUserId')
          .limit(5)
          .lean(),
        Provider
          .find({ name: rx, status: DUP_PROVIDER_STATUSES, ...(place.city ? { 'address.city': place.city } : {}) })
          .select('providerId name status ownerUserId address.city')
          .limit(5)
          .lean(),
      ]);
      const foreignApps = appRows.filter((row) => String(row.applicantUserId) !== applicantId);
      const foreignProviders = providers.filter((row) => String(row.ownerUserId ?? '') !== applicantId);
      if (foreignApps.length > 0 || foreignProviders.length > 0) {
        const ref = foreignApps[0]?.applicationId || foreignProviders[0]?.providerId || '';
        checks.push(check('duplicate_name', 'flag', 'review', `similar name already on platform (${ref})${place.city ? ` in ${place.city}` : ''}`));
      } else {
        checks.push(check('duplicate_name', 'pass', 'info', 'no similar listing found'));
      }
    } catch (err) {
      checks.push(check('duplicate_name', 'error', 'review', `name duplicate scan failed: ${err.message}`));
    }
  } else {
    checks.push(check('duplicate_name', 'skip', 'info', 'no business name supplied'));
  }

  // ── applicant contact hygiene ────────────────────────────────────────────
  let applicant;
  try {
    applicant = await User.findById(application?.applicantUserId).select('email phone').lean();
  } catch {
    applicant = null;
  }
  if (applicant?.email) {
    checks.push(isDisposableEmail(applicant.email)
      ? check('disposable_email', 'flag', 'review', `disposable inbox domain on ${capSearch(applicant.email, 80)}`)
      : check('disposable_email', 'pass', 'info', 'email domain accepted'));
  } else {
    checks.push(check('disposable_email', 'skip', 'info', 'no email on the applicant account'));
  }
  if (applicant?.phone) {
    checks.push(looksVoip(applicant.phone)
      ? check('voip_phone', 'flag', 'review', `phone "${capSearch(applicant.phone, 20)}" is outside the normal mobile pattern`)
      : check('voip_phone', 'pass', 'info', 'phone pattern accepted'));
  } else {
    checks.push(check('voip_phone', 'skip', 'info', 'no phone on the applicant account'));
  }

  // ── penny-drop name match (2.md 14 payout verification) ──────────────────
  if (ids.account_holder && ids.account_number) {
    try {
      const result = await verifyPennyDrop({
        ifsc: pickText(ids.ifsc),
        accountNumber: pickText(ids.account_number),
        accountHolder: pickText(ids.account_holder),
      });
      if (result.status === 'verified') {
        checks.push(check('payout_name_match', 'pass', 'info', `payout name verified (${result.mode})`));
      } else if (result.status === 'name_mismatch') {
        checks.push(check('payout_name_match', 'flag', 'conflict', `payout name mismatch: bank credited "${String(result.creditedName).slice(0, 60)}"`));
      } else if (result.status === 'unavailable') {
        checks.push(check('payout_name_match', 'flag', 'review', `penny-drop unavailable: ${result.note}`));
      } else {
        checks.push(check('payout_name_match', 'skip', 'info', result.note));
      }
    } catch (err) {
      checks.push(check('payout_name_match', 'error', 'review', `penny-drop failed: ${err.message}`));
    }
  } else {
    checks.push(check('payout_name_match', 'skip', 'info', 'no payout account supplied'));
  }

  // ── PIN circle vs stated state ───────────────────────────────────────────
  if (place.pincode && place.state) {
    const circle = PIN_CIRCLES[place.pincode.slice(0, 2)];
    if (!circle) {
      checks.push(check('pin_location_match', 'skip', 'info', `PIN ${place.pincode} is outside the mapped postal circles`));
    } else {
      const stated = place.state.toLowerCase();
      const agrees = circle.some((s) => {
        const lc = s.toLowerCase();
        return stated.includes(lc) || lc.includes(stated);
      });
      checks.push(agrees
        ? check('pin_location_match', 'pass', 'info', `PIN ${place.pincode} and stated state "${place.state}" agree`)
        : check('pin_location_match', 'flag', 'review',
          `PIN ${place.pincode} belongs to ${circle.slice(0, 2).join(' / ')} but the address says "${place.state}" — verify the location`));
    }
  } else {
    checks.push(check('pin_location_match', 'skip', 'info', 'no PIN or state in the address'));
  }

  // ── verdict ──────────────────────────────────────────────────────────────
  const hasConflict = checks.some((c) => c.status === 'flag' && c.severity === 'conflict');
  const hasFlag = checks.some((c) => c.status === 'flag');
  const hasError = checks.some((c) => c.status === 'error');
  const verdict = hasConflict ? 'conflict' : hasFlag ? 'review' : hasError ? 'error' : 'clear';

  return {
    verdict,
    runAt,
    // A tax-identity or payout-name conflict forces the second approver, so a
    // duplicate identity can never be waved through by one reviewer.
    forceTwoPerson: verdict === 'conflict',
    checks,
  };
}

export { evaluateNameMatch };

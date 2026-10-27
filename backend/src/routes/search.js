import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { publicSearchLimiter } from '../middleware/rateLimit.js';
import { searchProviders, searchDrugs, searchEhr, isOpenSearchConfigured } from '../services/opensearchIndexer.js';
import { toSearchCard } from '../utils/searchDto.js';
import { expandSearchQuery } from '../config/searchTaxonomy.js';
import { SPECIALTIES, isTopLevelSpecialty } from '../lib/taxonomy.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import { assertEhrSearchAccess } from '../services/ehrSearchAccess.js';
import { sendServerError } from '../utils/safeError.js';
import { roleHasPermission } from '../config/permissions.js';

const router = express.Router();

// ─── GET /api/search?q=&type=&city=&lat=&lng= — public directory search ──────
// 10.md 4.1 (anonymous, cacheable, DTO-only). Same engine as the authenticated
// route below; what makes it public-safe is toSearchCard — an allowlist, since
// the OpenSearch path spreads index documents verbatim and nobody is logged in
// to vouch for what a future indexed field contains.
// authz: public
router.get('/', publicSearchLimiter, async (req, res) => {
  try {
    const { q, type, vertical, city, lat, lng, lon, radiusKm, size } = req.query;
    const lonValue = lng != null ? lng : lon;
    const out = await searchProviders({
      q,
      vertical: vertical ?? type,
      city,
      lat: lat != null ? Number(lat) : undefined,
      lon: lonValue != null ? Number(lonValue) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : undefined,
      size: Math.min(Number(size) || 20, 50),
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.removeHeader('Pragma');
    res.json({
      success: true,
      engine: isOpenSearchConfigured() ? 'opensearch' : 'mongo',
      source: out.source,
      results: (out.results ?? []).map(toSearchCard),
    });
  } catch (err) {
    logger.error(`Public search error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/suggest?q= — light typeahead for the browse UI ─────────
// Specialties search user spec c#4: suggestions come from the real taxonomy
// (tiles, sub-specialties, conditions, procedures, Hinglish symptoms), not
// generic strings. Sensitive tiles stay out of suggestions; red-flag queries
// surface the emergency banner inline.
// authz: public
router.get('/suggest', publicSearchLimiter, (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const taxonomy = expandSearchQuery(q);
  const taxonomyPayload = {
    isEmergency: taxonomy.isEmergency,
    emergencyMessage: taxonomy.emergencyMessage,
    isSensitive: taxonomy.isSensitive,
    crisisHotline: taxonomy.crisisHotline,
  };
  if (q.length < 2) {
    return res.json({ success: true, q, results: [], taxonomy: taxonomyPayload });
  }

  // A sensitive tile hides itself and everything nested under it (child subs
  // inherit via parent walk; INFERT's IVF chip stays discreet too).
  const byLower = new Map(SPECIALTIES.map((s) => [s.code.toLowerCase(), s]));
  const isHidden = (entry) => {
    for (let hit = entry; hit; ) {
      if (hit.sensitive) return true;
      const parentCode = hit.code.split('.').slice(0, 2).join('.');
      hit = hit.code === parentCode ? null : byLower.get(parentCode.toLowerCase());
    }
    return false;
  };
  // Alias strings that name the sensitive surface itself (Sleep Psychiatry…)
  // must not leak the topic through a search for its own keyword.
  const SENSITIVE_TEXT_RE = /psychiatr|psycholog|sexolog|deaddiction|suicid|hiv/i;

  const scored = [];
  for (const s of SPECIALTIES) {
    if (isHidden(s)) continue;
    const nm = s.name.toLowerCase();
    const subToken = s.code.split('.').pop().replace(/_/g, ' ').toLowerCase();
    const aliases = (s.aliases || []).map((a) => a.toLowerCase());
    let score = Infinity;
    let viaAliasMatch = null;
    if (nm === q) score = 0;
    else if (nm.startsWith(q)) score = 1;
    else if (nm.includes(q)) score = 2;
    else if (subToken.startsWith(q) && subToken.length > 3) score = 3;
    else if ((viaAliasMatch = aliases.find((a) => a.startsWith(q)))) score = 3.5;
    else if ((viaAliasMatch = aliases.find((a) => a.includes(q)))) score = 4;
    // A sensitive keyword must match nothing — not even an alias mention
    // ('Sleep Psychiatry' must not surface when the user types 'psych').
    if (score === Infinity || SENSITIVE_TEXT_RE.test(nm) || (viaAliasMatch && SENSITIVE_TEXT_RE.test(viaAliasMatch))) continue;
    scored.push({
      kind: 'specialty',
      score,
      item: {
        code: s.code,
        name: s.name,
        parent: isTopLevelSpecialty(s) ? null : s.code.split('.').slice(0, 2).join('.'),
        nameHi: s.meta?.nameHi || null,
      },
    });
  }

  // Symptom / condition / procedure chips resolve to their parent tile, so the
  // typeahead can plant a query already filtered by that specialty.
  for (const top of SPECIALTIES.filter(isTopLevelSpecialty)) {
    if (isHidden(top)) continue;
    const chipBase = { specialty: { code: top.code, name: top.name, nameHi: top.meta?.nameHi || null, icon: top.meta?.icon || null } };
    const matchChips = (list, kind, offset) => {
      for (const raw of list || []) {
        const lv = String(raw).toLowerCase();
        let rel = -1;
        if (lv === q) rel = 0;
        else if (lv.startsWith(q)) rel = 1;
        else if (lv.includes(q)) rel = 2;
        if (rel < 0) continue;
        scored.push({ kind, score: 5 + offset + rel, item: { ...chipBase, label: String(raw) } });
      }
    };
    matchChips(top.meta?.symptoms, 'symptom', 0);
    matchChips(top.meta?.conditions, 'condition', 1);
    matchChips(top.meta?.procedures, 'procedure', 2);
  }

  scored.sort((a, b) => a.score - b.score || String(a.item.label || a.item.name).localeCompare(String(b.item.label || b.item.name)));
  const results = scored.slice(0, 10).map(({ kind, item }) => ({ kind, ...item }));

  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, q, total: results.length, results, taxonomy: taxonomyPayload });
});

// ─── GET /api/search/providers?q=&vertical=&city=&lat=&lon=&radiusKm= ───────
// Spec 15: typo-tolerant provider discovery (OpenSearch when configured,
// transparent Mongo fallback otherwise).
// authz: self
router.get('/providers', protect, async (req, res) => {
  try {
    const { q, vertical, city, lat, lon, radiusKm, size } = req.query;
    const out = await searchProviders({
      q, vertical, city,
      lat: lat != null ? Number(lat) : undefined,
      lon: lon != null ? Number(lon) : undefined,
      radiusKm: radiusKm != null ? Number(radiusKm) : 15,
      size: Math.min(Number(size) || 20, 50),
    });
    // Same allowlist as the public route above: one definition, two callers,
    // so the authenticated surface can never drift wider than the anonymous one.
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : 'mongo', ...out, results: (out.results ?? []).map(toSearchCard) });
  } catch (err) {
    logger.error(`Provider search error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/drugs?q=&salt= — brand → in-stock substitutes by savings
// authz: self
router.get('/drugs', protect, async (req, res) => {
  try {
    const out = await searchDrugs({ q: req.query.q, salt: req.query.salt, size: Math.min(Number(req.query.size) || 20, 50) });
    if (out.source === 'denied') return res.status(403).json({ success: false, ...out });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/icd?q= — ICD-10 code/title search
// authz: self
router.get('/icd', protect, async (req, res) => {
  try {
    const { searchIcd } = await import('../services/opensearchIndexer.js');
    const out = await searchIcd({ q: req.query.q, size: Math.min(Number(req.query.size) || 20, 50) });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/ehr?patientId=&q=&consentId= — consent-gated EHR search
router.get('/ehr', protect, async (req, res) => {
  try {
    // AUTHZ: `patientId` arrives from the request and was passed straight into
    // searchEhr. The consent check inside that function answers "does a GRANTED
    // consent exist for THIS patient" — it never asks "is the CALLER allowed to
    // read THIS patient". Those are different questions, and only the second one
    // is an authorization decision.
    //
    // The consequence: any authenticated account could read any patient's
    // diagnosis history, notes and symptoms by passing that patient's id and a
    // query term, as long as that patient had granted consent to their own
    // treating doctor. The consent is the PATIENT's grant to a clinician, and it
    // was being used as proof about a completely different principal.
    //
    // It is worse via `consentId`: that branch does `findOne({ consentId })` with
    // no patient binding at all, so a single known consent id returns records for
    // any patient.
    //
    // So: resolve the caller/patient relationship here, before the search.
    const patientId = req.query.patientId;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const decision = await assertEhrSearchAccess(req, patientId, req.query.consentId);
    if (!decision.ok) {
      // 404, not 403: a 403 confirms the patient id exists, which is exactly the
      // oracle an attacker needs to enumerate the patient population.
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const out = await searchEhr({ patientId, q: req.query.q, consentId: req.query.consentId });
    if (out.source === 'denied') return res.status(403).json({ success: false, ...out });
    res.json({ success: true, engine: isOpenSearchConfigured() ? 'opensearch' : out.source, ...out });
  } catch (err) {
    logger.error(`EHR search error: ${err.message}`);
    sendServerError(res, err, 'Search is temporarily unavailable');
  }
});

// ─── File 13 §13.7: master search (auth, grouped, tenant-scoped) ───────────
// Query grammar: `bill:123`, `pt:name`, `rx:drug`, `bed:12`, `staff:name`,
// `ticket:…`; bare text fans out to all groups (top 5 each).

function parseMasterQuery(raw) {
  const q = String(raw || '').trim();
  const m = q.match(/^([a-z]{2,8}):\s*(.+)$/i);
  if (m) return { prefix: m[1].toLowerCase(), text: m[2].trim() };
  return { prefix: '', text: q };
}

const ID_LIKE = /^[0-9a-f]{8,24}$/i;

router.get('/all', protect, async (req, res) => {
  try {
    const { prefix, text } = parseMasterQuery(req.query.q);
    if (text.length < 2) return res.json({ groups: [] });
    const rx = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const hospitalId = req.user.hospitalId;
    const groups = [];
    const want = (key) => !prefix || {
      bill: ['bills'], pt: ['patients'], rx: ['pharmacy'], bed: ['beds'],
      staff: ['staff'], ticket: ['tasks'], appt: ['appointments'],
      rad: ['radiology'], img: ['appointments'], study: ['radiology'],
      // §10: lab order number / accession, and the patient-identity prefixes.
      lab: ['lab'], acc: ['lab'], ord: ['lab'],
      uhid: ['patients', 'lab'], phone: ['patients'],
    }[prefix]?.includes(key);
    const { safeFirst } = await import('../lib/approvalWiring.js');
    // §10: who may resolve a patient identity from a name/UHID/phone search.
    // The original hardcoded list had no laboratory role — a pathologist could
    // verify a result but not find the patient it belongs to. lab:read (the
    // permission every lab console already gates on) is the second door.
    const canSearchPatients = ['doctor', 'nurse', 'receptionist', 'hospital_admin', 'clinic_admin', 'superadmin'].includes(req.user.role)
      || roleHasPermission(req.user.role, 'lab:read');
    // §10: UHID / phone are first-class query terms, not just name matches —
    // UHID is an exact key (numeric or UUID-shaped), phone matches with or
    // without separators; a name that happens to be long is harmless here
    // because both are equality checks, not regexes.
    const patientOr = [{ name: rx }];
    if (text.length >= 6) patientOr.push({ uhid: text });
    if (/^[+0-9][0-9\s-]{5,18}$/.test(text)) patientOr.push({ phone: text.replace(/[\s-]/g, '') }, { phone: text });

    const tasks = [];
    if (want('patients') && canSearchPatients) {
      tasks.push((async () => {
        const { default: Patient } = await import('../models/Patient.js');
        const rows = await safeFirst(Patient.find({ $or: patientOr }).select('name phone gender dob uhid').limit(5).lean()) || [];
        groups.push({ key: 'patients', label: 'Patients', items: rows.map((p) => ({ id: String(p._id), title: p.name, sub: [p.uhid, p.phone].filter(Boolean).join(' · ') })) });
      })());
    }
    // §10: lab orders by order number / accession / patient name (staff only —
    // a patient's own orders are reachable via GET /lab/orders, scoped to them).
    if (want('lab') && req.user.role !== 'patient') {
      tasks.push((async () => {
        const { default: LabOrder } = await import('../models/LabOrder.js');
        const or = [{ orderId: rx }, { accessionNo: rx }, { patientName: rx }];
        if (ID_LIKE.test(text)) or.push({ _id: text });
        const scope = req.user.hospitalId && req.user.role !== 'superadmin' ? { hospitalId: req.user.hospitalId } : {};
        const rows = await safeFirst(LabOrder.find({ ...scope, $or: or })
          .select('orderId accessionNo patientName doctorName status priority tests createdAt')
          .limit(5).lean()) || [];
        groups.push({
          key: 'lab', label: 'Lab Orders',
          items: rows.map((o) => ({
            id: String(o._id),
            title: o.orderId,
            sub: [o.accessionNo, o.patientName, o.status, `${(o.tests || []).length} test(s)`].filter(Boolean).join(' · '),
          })),
        });
      })());
    }
    if (want('bills')) {
      tasks.push((async () => {
        const { default: Billing } = await import('../models/Billing.js');
        const or = [{ invoiceId: rx }];
        if (ID_LIKE.test(text)) or.push({ _id: text });
        const rows = await safeFirst(Billing.find({ hospitalId, $or: or }).select('invoiceId amount status').limit(5).lean()) || [];
        groups.push({ key: 'bills', label: 'Bills', items: rows.map((b) => ({ id: String(b._id), title: b.invoiceId, sub: `${b.amount} · ${b.status}` })) });
      })());
    }
    if (want('appointments')) {
      tasks.push((async () => {
        const { default: Appointment } = await import('../models/Appointment.js');
        const or = [{ tokenNo: rx }];
        const rows = await safeFirst(Appointment.find({ hospitalId, $or: or }).select('tokenNo status date').limit(5).lean()) || [];
        const items = rows.map((a) => ({ id: String(a._id), title: `Token ${a.tokenNo}`, sub: a.status || '' }));
        // §32: imaging appointments are searchable by their IMG-… number too
        // (staff only — patients reach their own via GET /radiology/appointments).
        if (req.user.role !== 'patient') {
          const { default: ImagingAppointment } = await import('../models/ImagingAppointment.js');
          const imgRows = await safeFirst(ImagingAppointment.find({ hospitalId, appointmentNo: rx }).select('appointmentNo status modalityType scheduledStart').limit(5).lean()) || [];
          for (const a of imgRows) {
            items.push({ id: String(a._id), title: a.appointmentNo, sub: `${a.modalityType} · ${a.status}` });
          }
        }
        groups.push({ key: 'appointments', label: 'Appointments', items });
      })());
    }
    if (want('beds')) {
      tasks.push((async () => {
        const { default: Bed } = await import('../models/Bed.js');
        const rows = await safeFirst(Bed.find({ hospitalId, bedNumber: rx }).select('bedNumber status wardId').limit(5).lean()) || [];
        groups.push({ key: 'beds', label: 'Beds', items: rows.map((b) => ({ id: String(b._id), title: `Bed ${b.bedNumber}`, sub: b.status || '' })) });
      })());
    }
    if (want('staff')) {
      tasks.push((async () => {
        const { default: Staff } = await import('../models/Staff.js');
        const rows = await safeFirst(Staff.find({ hospitalId, $or: [{ name: rx }, { employeeId: rx }] }).select('name employeeId role status').limit(5).lean()) || [];
        groups.push({ key: 'staff', label: 'Staff', items: rows.map((s) => ({ id: String(s._id), title: s.name, sub: s.employeeId || s.role || '' })) });
      })());
    }
    if (want('pharmacy')) {
      tasks.push((async () => {
        const { default: Medicine } = await import('../models/Medicine.js');
        const rows = await safeFirst(Medicine.find({ name: rx }).select('name strength mrp').limit(5).lean()) || [];
        groups.push({ key: 'pharmacy', label: 'Medicines', items: rows.map((m) => ({ id: String(m._id), title: m.name, sub: m.strength || '' })) });
      })());
    }
    if (want('tasks')) {
      tasks.push((async () => {
        const { default: WorkTask } = await import('../models/WorkTask.js');
        const rows = await safeFirst(WorkTask.find({ hospitalId, title: rx }).select('title status priority').limit(5).lean()) || [];
        groups.push({ key: 'tasks', label: 'Tasks', items: rows.map((t) => ({ id: String(t._id), title: t.title, sub: `${t.status} · ${t.priority}` })) });
      })());
    }
    // §32: radiology — order number (ORD-RAD-…), study number (STU-…),
    // report number (RPT-…) and DICOM Study Instance UID all live on the
    // Radiology order document. Patients are excluded here (their own orders
    // are reachable via GET /radiology/orders, which scopes by patientId).
    if (want('radiology') && req.user.role !== 'patient') {
      tasks.push((async () => {
        const { default: Radiology } = await import('../models/Radiology.js');
        const or = [{ orderId: rx }, { studyNumber: rx }, { reportNumber: rx }, { studyUid: rx }];
        if (ID_LIKE.test(text)) or.push({ _id: text });
        const rows = await safeFirst(Radiology.find({ hospitalId, $or: or })
          .select('orderId studyNumber reportNumber studyUid modality bodyPart status patientName')
          .limit(5).lean()) || [];
        groups.push({
          key: 'radiology', label: 'Radiology',
          items: rows.map((r) => ({
            id: String(r._id),
            title: r.orderId,
            sub: [r.studyNumber, r.reportNumber, r.modality, r.bodyPart, r.status].filter(Boolean).join(' · '),
          })),
        });
      })());
    }
    await Promise.all(tasks);
    // Keyboard contract: flat list with group headers preserved in order.
    return res.json({ groups: groups.filter((g) => g.items.length) });
  } catch (err) {
    logger.error(`Master search error: ${err.message}`);
    return res.status(500).json({ groups: [], message: err.message });
  }
});

// ─── GET /api/search/unified — Multi-vertical, taxonomy-expanded directory search ───
// authz: public
router.get('/unified', publicSearchLimiter, async (req, res) => {
  try {
    const {
      q = '',
      category = '',
      vertical = '',
      city = '',
      lat,
      lng,
      lon,
      radiusKm = 15,
      openNow,
      homeVisit,
      online,
      verified,
      limit = 20,
    } = req.query;

    const taxonomy = expandSearchQuery(q);
    const targetCategory = category || vertical || taxonomy.matchedTaxonomy?.category || '';
    const targetSpecialty = taxonomy.matchedTaxonomy?.specialty || '';
    const rx = q.trim() ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const results = [];
    const maxItems = Math.min(Number(limit) || 20, 50);

    // 1. Search Facilities (hospitals, clinics, labs, pharmacies, etc.)
    const facilityFilter = { status: 'approved' };
    if (city && city.toLowerCase() !== 'all') {
      facilityFilter.city = new RegExp(`^${city.trim()}$`, 'i');
    }
    if (targetCategory && ['hospital', 'clinic', 'lab', 'pharmacy'].includes(targetCategory)) {
      facilityFilter.type = targetCategory;
    } else if (targetCategory) {
      facilityFilter.$or = [
        { type: targetCategory },
        { subType: targetCategory },
      ];
    }
    if (rx) {
      const orConditions = [
        { name: rx },
        { description: rx },
        { specialties: rx },
        { servicesOffered: rx },
      ];
      if (targetSpecialty) {
        orConditions.push({ specialties: new RegExp(targetSpecialty, 'i') });
      }
      if (facilityFilter.$or) {
        facilityFilter.$and = [{ $or: facilityFilter.$or }, { $or: orConditions }];
        delete facilityFilter.$or;
      } else {
        facilityFilter.$or = orConditions;
      }
    }

    const { default: Facility } = await import('../models/Facility.js');
    const matchedFacilities = await Facility.find(facilityFilter)
      .select('name slug type subType city address rating reviewsCount emergency24x7 appointmentModes logo')
      .limit(maxItems)
      .lean()
      .catch(() => []);

    for (const f of matchedFacilities) {
      results.push({
        id: String(f._id),
        providerId: String(f._id),
        fullName: f.name,
        slug: f.slug || String(f._id),
        vertical: f.type || 'facility',
        subType: f.subType,
        city: f.city,
        address: f.address,
        rating: f.rating || 0,
        reviewCount: f.reviewsCount || 0,
        verified: true,
        openNow: Boolean(f.emergency24x7),
        image: f.logo || '',
        category: f.subType || f.type,
      });
    }

    // 2. Search Doctors if remaining slots
    if (results.length < maxItems && (!targetCategory || ['doctor', 'clinic', 'hospital'].includes(targetCategory))) {
      const { default: Doctor } = await import('../models/Doctor.js');
      const docFilter = {};
      if (city && city.toLowerCase() !== 'all') docFilter.city = new RegExp(`^${city.trim()}$`, 'i');
      if (rx || targetSpecialty) {
        const docOr = [];
        if (rx) docOr.push({ name: rx }, { specialization: rx });
        if (targetSpecialty) docOr.push({ specialization: new RegExp(targetSpecialty, 'i') });
        docFilter.$or = docOr;
      }
      const matchedDocs = await Doctor.find(docFilter)
        .select('name specialization city fee experience rating reviewsCount photo emergencySupport')
        .limit(maxItems - results.length)
        .lean()
        .catch(() => []);

      for (const d of matchedDocs) {
        results.push({
          id: String(d._id),
          providerId: String(d._id),
          fullName: d.name ? `Dr. ${d.name}` : 'Practitioner',
          vertical: 'doctor',
          specialization: d.specialization,
          city: d.city,
          rating: d.rating || 4.5,
          reviewCount: d.reviewsCount || 0,
          verified: true,
          fee: d.fee,
          image: d.photo || '',
          emergency: Boolean(d.emergencySupport),
        });
      }
    }

    // 3. Search Medicines if search query matches drug or pharmacy category
    if (results.length < maxItems && (targetCategory === 'pharmacy' || (!targetCategory && rx))) {
      const { default: Medicine } = await import('../models/Medicine.js');
      const medFilter = rx ? { $or: [{ name: rx }, { genericName: rx }] } : {};
      const matchedMeds = await Medicine.find(medFilter)
        .select('name genericName category form sellingPrice currentStock')
        .limit(Math.min(5, maxItems - results.length))
        .lean()
        .catch(() => []);

      for (const m of matchedMeds) {
        results.push({
          id: String(m._id),
          providerId: String(m._id),
          fullName: m.name,
          specialization: m.genericName,
          vertical: 'medicine',
          category: 'pharmacy',
          fee: m.sellingPrice,
          inStock: (m.currentStock ?? 0) > 0,
        });
      }
    }

    // 4. Log unmet demand if zero results and search text was provided
    let unmetDemandLogged = false;
    if (results.length === 0 && q.trim()) {
      try {
        const { default: UnmetDemand } = await import('../models/UnmetDemand.js');
        await UnmetDemand.findOneAndUpdate(
          { query: q.trim().toLowerCase(), city: city || 'All' },
          {
            $inc: { count: 1 },
            $set: {
              lastRequestedAt: new Date(),
              category: targetCategory,
              ip: req.ip || '',
            },
          },
          { upsert: true }
        );
        unmetDemandLogged = true;
      } catch (err) {
        logger.warn(`Failed to log unmet demand: ${err.message}`);
      }
    }

    res.set('Cache-Control', 'public, max-age=60');
    res.removeHeader('Pragma');

    return res.json({
      success: true,
      taxonomy: {
        isEmergency: taxonomy.isEmergency,
        emergencyMessage: taxonomy.emergencyMessage,
        isSensitive: taxonomy.isSensitive,
        crisisHotline: taxonomy.crisisHotline,
        matchedSpecialty: taxonomy.matchedTaxonomy?.specialty || null,
        suggestedQuery: taxonomy.matchedTaxonomy?.suggestedQuery || null,
        synonyms: taxonomy.synonyms || [],
      },
      total: results.length,
      results,
      unmetDemandLogged,
    });
  } catch (err) {
    logger.error(`Unified search error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/search/unmet-demand — Record unserved search request / request service in area ──
// authz: public
router.post('/unmet-demand', async (req, res) => {
  try {
    const { query, category, city, userContact, location } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required' });
    }
    const { default: UnmetDemand } = await import('../models/UnmetDemand.js');
    const doc = await UnmetDemand.findOneAndUpdate(
      { query: String(query).trim().toLowerCase(), city: String(city || 'All').trim() },
      {
        $inc: { count: 1 },
        $set: {
          category: category || '',
          userContact: userContact || '',
          location: location || {},
          lastRequestedAt: new Date(),
          ip: req.ip || '',
        },
      },
      { upsert: true, new: true }
    );
    return res.json({
      success: true,
      message: 'Demand recorded successfully. Our ops team prioritizes onboarding providers in high-demand zones.',
      data: doc,
    });
  } catch (err) {
    logger.error(`Record unmet demand error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/search/unmet-demand — Aggregated unmet demand analytics for ops ───
// authz: role
router.get('/unmet-demand', protect, adminOnly, async (req, res) => {
  try {
    const { default: UnmetDemand } = await import('../models/UnmetDemand.js');
    const { status, city, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (city) filter.city = new RegExp(city, 'i');

    const rows = await UnmetDemand.find(filter)
      .sort({ count: -1, lastRequestedAt: -1 })
      .limit(Math.min(Number(limit) || 50, 200))
      .lean();

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    logger.error(`Get unmet demand error: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

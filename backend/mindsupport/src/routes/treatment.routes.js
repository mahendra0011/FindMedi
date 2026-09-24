import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

const normalizePrescription = (p) => {
  if (!p) return null;
  const raw = p.toObject ? p.toObject({ virtuals: true }) : p;
  return {
    id: String(raw._id),
    counsellorName: raw.counsellor?.name || "",
    counsellorId: String(raw.counsellor?._id || ""),
    userName: raw.user?.name || "",
    userEmail: raw.user?.email || "",
    userId: String(raw.user?._id || raw.user || ""),
    status: raw.status || "active",
    revokedAt: raw.revokedAt || null,
    revokeReason: raw.revokeReason || "",
    renewedFrom: raw.renewedFrom ? String(raw.renewedFrom) : null,
    clinicName: raw.clinicName || "",
    diagnosis: raw.diagnosis || "",
    notes: raw.notes || "",
    followUpDate: raw.followUpDate || null,
    medicines: (raw.medicines || []).map((m) => ({
      name: m.name,
      dosage: m.dosage || "",
      frequency: m.frequency || "",
      duration: m.duration || "",
      notes: m.notes || "",
    })),
    createdAt: raw.createdAt,
  };
};

const normalizeAssignment = (a) => {
  if (!a) return null;
  const raw = a.toObject ? a.toObject({ virtuals: true }) : a;
  return {
    id: String(raw._id),
    counsellorName: raw.counsellor?.name || "",
    counsellorId: String(raw.counsellor?._id || ""),
    userName: raw.user?.name || "",
    userEmail: raw.user?.email || "",
    userId: String(raw.user?._id || raw.user || ""),
    title: raw.title,
    description: raw.description || "",
    category: raw.category || "other",
    status: raw.status || "pending",
    dueDate: raw.dueDate || null,
    completedAt: raw.completedAt || null,
    createdAt: raw.createdAt,
  };
};

export function registerTreatmentRoutes(app, context) {
  const {
    Prescription,
    Assignment,
    User,
    asyncRoute,
    authRequired,
    requireRoles,
  } = context;

  // ─── Prescriptions ──────────────────────────────────────────────────────────

  app.post(
    "/api/prescriptions",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist"),
    body("userId").notEmpty().withMessage("User ID is required"),
    body("medicines").isArray({ min: 1 }).withMessage("At least one medicine is required"),
    body("medicines.*.name").notEmpty().withMessage("Medicine name is required"),
    validate,
    asyncRoute(async (req, res) => {
      const prescription = await Prescription.create({
        user: req.body.userId,
        counsellor: req.user._id,
        appointment: req.body.appointmentId || undefined,
        clinicName: String(req.body.clinicName || "").trim(),
        diagnosis: String(req.body.diagnosis || "").trim(),
        notes: String(req.body.notes || "").trim(),
        followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : undefined,
        medicines: (req.body.medicines || []).map((m) => ({
          name: String(m.name).trim(),
          dosage: String(m.dosage || "").trim(),
          frequency: String(m.frequency || "").trim(),
          duration: String(m.duration || "").trim(),
          notes: String(m.notes || "").trim(),
        })),
      });
      const populated = await Prescription.findById(prescription._id).populate("counsellor", "name");
      res.status(201).json(normalizePrescription(populated));
    })
  );

  app.get(
    "/api/prescriptions/my",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      // U-1: dual-id bridge so merged-mode FindMedi patients see their Rx.
      const myIds = [req.user._id];
      if (req.user?.email && User) {
        const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindSelf && String(mindSelf._id) !== String(req.user._id)) myIds.push(mindSelf._id);
      }
      const prescriptions = await Prescription.find({ user: { $in: myIds }, status: { $ne: "revoked" } })
        .populate("counsellor", "name")
        .sort({ createdAt: -1 });
      res.json(prescriptions.map(normalizePrescription));
    })
  );

  app.get(
    "/api/prescriptions",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    asyncRoute(async (req, res) => {
      const userIds = [req.user._id];
      if (req.user.email && User) {
        const mindUser = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindUser) userIds.push(mindUser._id);
      }
      const filter = ["counsellor", "psychiatrist"].includes(req.user.role)
        ? { counsellor: { $in: userIds } }
        : {};
      const prescriptions = await Prescription.find(filter)
        .populate("counsellor", "name")
        .populate("user", "name email")
        .sort({ createdAt: -1 });
      res.json(prescriptions.map(normalizePrescription));
    })
  );

  // PS-6: resolve all ids this caller may own (merged-mode FindMedi + mind).
  async function resolveOwnerIds(req) {
    const ids = [String(req.user._id)];
    try {
      if (req.user?.email && User) {
        const mindUser = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindUser && !ids.includes(String(mindUser._id))) ids.push(String(mindUser._id));
      }
    } catch { /* ignore */ }
    return ids;
  }

  // PS-6: edit an active prescription (owner counsellor/psychiatrist only).
  app.put(
    "/api/prescriptions/:id",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist"),
    body("medicines").optional().isArray({ min: 1 }).withMessage("At least one medicine is required"),
    body("medicines.*.name").optional().notEmpty().withMessage("Medicine name is required"),
    validate,
    asyncRoute(async (req, res) => {
      const prescription = await Prescription.findById(req.params.id);
      if (!prescription) {
        res.status(404).json({ error: "Prescription not found" });
        return;
      }
      const ownerIds = await resolveOwnerIds(req);
      if (!ownerIds.includes(String(prescription.counsellor))) {
        res.status(403).json({ error: "Only the prescribing doctor can edit this prescription" });
        return;
      }
      if (prescription.status === "revoked") {
        res.status(409).json({ error: "Revoked prescriptions cannot be edited — renew instead" });
        return;
      }
      for (const key of ["diagnosis", "clinicName", "notes"]) {
        if (typeof req.body[key] === "string") prescription[key] = req.body[key].trim();
      }
      if (req.body.followUpDate !== undefined) {
        prescription.followUpDate = req.body.followUpDate ? new Date(req.body.followUpDate) : undefined;
      }
      if (Array.isArray(req.body.medicines)) {
        prescription.medicines = req.body.medicines.map((m) => ({
          name: String(m.name || "").trim(),
          dosage: String(m.dosage || "").trim(),
          frequency: String(m.frequency || "").trim(),
          duration: String(m.duration || "").trim(),
          notes: String(m.notes || "").trim(),
        })).filter((m) => m.name);
        if (prescription.medicines.length === 0) {
          res.status(400).json({ error: "At least one medicine with a name is required" });
          return;
        }
      }
      await prescription.save();
      const populated = await Prescription.findById(prescription._id).populate("counsellor", "name").populate("user", "name email");
      res.json(normalizePrescription(populated));
    })
  );

  // PS-6: revoke a prescription (soft-delete with reason + audit trail).
  app.patch(
    "/api/prescriptions/:id/revoke",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    asyncRoute(async (req, res) => {
      const prescription = await Prescription.findById(req.params.id);
      if (!prescription) {
        res.status(404).json({ error: "Prescription not found" });
        return;
      }
      const ownerIds = await resolveOwnerIds(req);
      const isOwner = ownerIds.includes(String(prescription.counsellor));
      if (!isOwner && req.user.role !== "admin") {
        res.status(403).json({ error: "Only the prescribing doctor can revoke this prescription" });
        return;
      }
      if (prescription.status === "revoked") {
        res.status(409).json({ error: "Prescription already revoked" });
        return;
      }
      prescription.status = "revoked";
      prescription.revokedAt = new Date();
      prescription.revokeReason = String(req.body?.reason || "").trim().slice(0, 300);
      await prescription.save();
      const populated = await Prescription.findById(prescription._id).populate("counsellor", "name").populate("user", "name email");
      res.json(normalizePrescription(populated));
    })
  );

  // PS-6: renew — new active prescription copying the original, linked via renewedFrom.
  app.post(
    "/api/prescriptions/:id/renew",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist"),
    asyncRoute(async (req, res) => {
      const original = await Prescription.findById(req.params.id);
      if (!original) {
        res.status(404).json({ error: "Prescription not found" });
        return;
      }
      const ownerIds = await resolveOwnerIds(req);
      if (!ownerIds.includes(String(original.counsellor))) {
        res.status(403).json({ error: "Only the prescribing doctor can renew this prescription" });
        return;
      }
      const renewed = await Prescription.create({
        user: original.user,
        counsellor: original.counsellor,
        appointment: original.appointment || undefined,
        clinicName: typeof req.body?.clinicName === "string" ? req.body.clinicName.trim() : original.clinicName,
        diagnosis: typeof req.body?.diagnosis === "string" ? req.body.diagnosis.trim() : original.diagnosis,
        notes: typeof req.body?.notes === "string" ? req.body.notes.trim() : original.notes,
        followUpDate: req.body?.followUpDate ? new Date(req.body.followUpDate) : original.followUpDate,
        medicines: original.medicines,
        renewedFrom: original._id,
      });
      const populated = await Prescription.findById(renewed._id).populate("counsellor", "name").populate("user", "name email");
      res.status(201).json(normalizePrescription(populated));
    })
  );

  // ─── Assignments ────────────────────────────────────────────────────────────

  app.post(
    "/api/assignments",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist"),
    body("userId").notEmpty().withMessage("User ID is required"),
    body("title").trim().isLength({ min: 1 }).withMessage("Title is required"),
    validate,
    asyncRoute(async (req, res) => {
      const assignment = await Assignment.create({
        user: req.body.userId,
        counsellor: req.user._id,
        appointment: req.body.appointmentId || undefined,
        title: String(req.body.title).trim(),
        description: String(req.body.description || "").trim(),
        category: req.body.category || "other",
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      });
      const populated = await Assignment.findById(assignment._id).populate("counsellor", "name");
      res.status(201).json(normalizeAssignment(populated));
    })
  );

  app.get(
    "/api/assignments/my",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      // U-1: dual-id bridge so merged-mode FindMedi patients see their homework.
      const myIds = [req.user._id];
      if (req.user?.email && User) {
        const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindSelf && String(mindSelf._id) !== String(req.user._id)) myIds.push(mindSelf._id);
      }
      const assignments = await Assignment.find({ user: { $in: myIds } })
        .populate("counsellor", "name")
        .sort({ createdAt: -1 });
      res.json(assignments.map(normalizeAssignment));
    })
  );

  // PS-2: provider view — assignments created by this counsellor/psychiatrist
  // (dual-id bridge so merged-mode FindMedi ids also match).
  app.get(
    "/api/assignments",
    asyncRoute(authRequired),
    requireRoles("counsellor", "psychiatrist", "admin"),
    asyncRoute(async (req, res) => {
      const userIds = [req.user._id];
      if (req.user.email && User) {
        const mindUser = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindUser) userIds.push(mindUser._id);
      }
      const assignments = await Assignment.find({ counsellor: { $in: userIds } })
        .populate("counsellor", "name")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(100);
      res.json(assignments.map(normalizeAssignment));
    })
  );

  app.patch(
    "/api/assignments/:id/complete",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const myIds = [req.user._id];
      if (req.user?.email && User) {
        const mindSelf = await User.findOne({ email: req.user.email }).select("_id").lean().catch(() => null);
        if (mindSelf && String(mindSelf._id) !== String(req.user._id)) myIds.push(mindSelf._id);
      }
      const assignment = await Assignment.findOne({ _id: req.params.id, user: { $in: myIds } });
      if (!assignment) {
        res.status(404).json({ error: "Assignment not found" });
        return;
      }
      assignment.status = "completed";
      assignment.completedAt = new Date();
      await assignment.save();
      res.json(normalizeAssignment(assignment));
    })
  );
}

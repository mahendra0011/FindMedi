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
      const prescriptions = await Prescription.find({ user: req.user._id })
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
      const filter = ["counsellor", "psychiatrist"].includes(req.user.role) ? { counsellor: req.user._id } : {};
      const prescriptions = await Prescription.find(filter)
        .populate("counsellor", "name")
        .populate("user", "name email")
        .sort({ createdAt: -1 });
      res.json(prescriptions.map(normalizePrescription));
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
      const assignments = await Assignment.find({ user: req.user._id })
        .populate("counsellor", "name")
        .sort({ createdAt: -1 });
      res.json(assignments.map(normalizeAssignment));
    })
  );

  app.patch(
    "/api/assignments/:id/complete",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const assignment = await Assignment.findOne({ _id: req.params.id, user: req.user._id });
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

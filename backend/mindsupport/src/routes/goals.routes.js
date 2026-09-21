import { body, validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array().map((e) => e.msg).join(". ") });
    return;
  }
  next();
};

function normalizeGoal(goal) {
  if (!goal) return null;
  const raw = goal.toObject ? goal.toObject({ virtuals: true }) : goal;
  return {
    id: String(raw._id || raw.id),
    title: raw.title,
    description: raw.description || "",
    category: raw.category || "custom",
    target: raw.target || 1,
    progress: raw.progress || 0,
    unit: raw.unit || "times",
    status: raw.status || "active",
    completedAt: raw.completedAt || null,
    dueDate: raw.dueDate || null,
    createdAt: raw.createdAt,
  };
}

async function recalculateGoalProgress(WellnessGoal, MoodEntry, Assessment, Journal, Appointment, userId) {
  const goals = await WellnessGoal.find({ user: userId, status: "active" });
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  for (const goal of goals) {
    let newProgress = goal.progress;

    if (goal.category === "mood") {
      const count = await MoodEntry.countDocuments({
        user: userId,
        date: { $gte: weekAgo.toISOString().slice(0, 10) },
      });
      newProgress = Math.min(count, goal.target);
    } else if (goal.category === "assessment") {
      const count = await Assessment.countDocuments({ user: userId });
      newProgress = Math.min(count, goal.target);
    } else if (goal.category === "journal") {
      const count = await Journal.countDocuments({
        user: userId,
        createdAt: { $gte: weekAgo },
      });
      newProgress = Math.min(count, goal.target);
    } else if (goal.category === "session") {
      const count = await Appointment.countDocuments({
        student: userId,
        status: "completed",
      });
      newProgress = Math.min(count, goal.target);
    }

    if (newProgress !== goal.progress) {
      goal.progress = newProgress;
      if (goal.progress >= goal.target && goal.status === "active") {
        goal.status = "completed";
        goal.completedAt = new Date();
      }
      await goal.save();
    }
  }
}

export function registerGoalRoutes(app, context) {
  const {
    WellnessGoal,
    MoodEntry,
    Assessment,
    Journal,
    Appointment,
    asyncRoute,
    authRequired,
  } = context;

  app.get(
    "/api/wellness/goals",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      await recalculateGoalProgress(WellnessGoal, MoodEntry, Assessment, Journal, Appointment, req.user._id);
      const goals = await WellnessGoal.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.json(goals.map(normalizeGoal));
    })
  );

  app.post(
    "/api/wellness/goals",
    asyncRoute(authRequired),
    body("title").trim().isLength({ min: 1, max: 120 }).withMessage("Goal title is required (max 120 chars)"),
    body("category").optional().isIn(["mood", "assessment", "journal", "session", "custom"]),
    body("target").optional().isInt({ min: 1 }),
    validate,
    asyncRoute(async (req, res) => {
      const goal = await WellnessGoal.create({
        user: req.user._id,
        title: String(req.body.title).trim(),
        description: String(req.body.description || "").trim(),
        category: req.body.category || "custom",
        target: Number(req.body.target) || 1,
        unit: String(req.body.unit || "times").trim(),
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      });
      res.status(201).json(normalizeGoal(goal));
    })
  );

  app.patch(
    "/api/wellness/goals/:id",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const goal = await WellnessGoal.findOne({ _id: req.params.id, user: req.user._id });
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }
      if (req.body.title) goal.title = String(req.body.title).trim();
      if (req.body.description !== undefined) goal.description = String(req.body.description).trim();
      if (req.body.target) goal.target = Number(req.body.target);
      if (req.body.progress !== undefined) {
        goal.progress = Math.min(Number(req.body.progress), goal.target);
        if (goal.progress >= goal.target && goal.status === "active") {
          goal.status = "completed";
          goal.completedAt = new Date();
        }
      }
      if (req.body.status && ["active", "completed", "archived"].includes(req.body.status)) {
        goal.status = req.body.status;
        if (req.body.status === "completed") goal.completedAt = new Date();
        if (req.body.status === "active") goal.completedAt = undefined;
      }
      if (req.body.dueDate) goal.dueDate = new Date(req.body.dueDate);
      await goal.save();
      res.json(normalizeGoal(goal));
    })
  );

  app.delete(
    "/api/wellness/goals/:id",
    asyncRoute(authRequired),
    asyncRoute(async (req, res) => {
      const goal = await WellnessGoal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }
      res.json({ success: true });
    })
  );
}

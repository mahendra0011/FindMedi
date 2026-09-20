export function registerAnalyticsRoutes(app, context) {
  const {
    Appointment,
    Assessment,
    CounsellorApplication,
    Journal,
    Message,
    MoodEntry,
    Notification,
    OtpVerification,
    Payment,
    PeerComment,
    PeerPost,
    PeerReport,
    Resource,
    Review,
    User,
    MONGODB_URI,
    activeStatuses,
    approvedCounsellorStatuses,
    asyncRoute,
    authOptional,
    authRequired,
    badgeForCounsellorType,
    bcrypt,
    buildMeetLink,
    canAccessAppointment,
    canMessageUser,
    createNotification,
    crisisRegex,
    findCounsellor,
    findUserByIdentifier,
    generateOtpCode,
    hasAppointmentConflict,
    io,
    isDatabaseReady,
    listFromInput,
    mongoose,
    normalizeRole,
    clampRating,
    normalizeApplication,
    normalizeAppointment,
    normalizeAppointmentsWithReviewStatus,
    normalizeJournal,
    normalizeMessage,
    normalizeNotification,
    normalizePayment,
    normalizeReview,
    publicUser,
    refreshCounsellorRating,
    requireRoles,
    scoreAssessment,
    signToken,
    todayYMD,
  } = context;

app.get(
  "/api/analytics",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    const [appointments, resources, posts, comments, reports, assessments] = await Promise.all([
      Appointment.find(),
      Resource.find(),
      PeerPost.find(),
      PeerComment.find(),
      PeerReport.find(),
      Assessment.find(),
    ]);
    const by = (items, key) =>
      items.reduce((acc, item) => {
        const value = item[key] || "General";
        acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {});
    res.json({
      categories: by(assessments, "level"),
      appointments: {
        total: appointments.length,
        confirmed: appointments.filter((a) => a.status === "confirmed").length,
        pending: appointments.filter((a) => a.status === "pending").length,
        cancelled: appointments.filter((a) => a.status === "cancelled").length,
        byDate: by(appointments, "date"),
      },
      resources: {
        total: resources.length,
        byCategory: by(resources, "category"),
        byType: by(resources, "type"),
      },
      peerSupport: {
        totalPosts: posts.length,
        totalComments: comments.length,
        byCategory: by(posts, "category"),
        reports: reports.length,
        crisisPosts: posts.filter((p) => p.crisis).length,
      },
      insights: [
        "Appointments and peer reports are pulled from MongoDB.",
        "Assessment levels summarize recent wellness risk signals.",
        "Use the admin dashboard for role and account management.",
      ],
      timeframe: req.query.timeframe || "all",
      generatedAt: new Date().toISOString(),
    });
  })
);

app.get(
  "/api/analytics/charts/:chart_type",
  asyncRoute(authRequired),
  requireRoles("admin"),
  asyncRoute(async (req, res) => {
    res.json({
      type: req.params.chart_type,
      description: "Use the dashboard charts rendered client-side from analytics data.",
      chart: "",
    });
  })
);
}

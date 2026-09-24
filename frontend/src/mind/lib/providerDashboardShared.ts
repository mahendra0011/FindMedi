// PS-5: shared provider-dashboard helpers (was copy-pasted in Counsellor + Psychiatrist dashboards).

const noteTemplates = [
  "Client appeared stable. Continued grounding practice and daily mood tracking recommended.",
  "Discussed stress triggers, sleep routine, and one small action before next session.",
  "Reviewed safety plan, support contacts, and escalation steps if risk increases.",
  "Created weekly wellness task: breathing practice, hydration, and journaling check-in.",
];

const statusTone = {
  upcoming: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  confirmed: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/20",
  declined: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};


const defaultPrivacySettings = {
  showOnlineStatus: true,
  allowMessages: true,
  shareProgressWithCounsellor: true,
  anonymousDisplayName: "",
};

const defaultNotificationSettings = {
  session: true,
  messages: true,
  payments: true,
  platform: true,
  emergency: true,
};

const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const packagePricePlans = [
  {
    key: "oneTime",
    title: "One-Time Session",
    detail: "Single counselling session",
    hint: "Immediate support, one-off guidance",
    fallback: 599,
  },
  {
    key: "shortTerm",
    title: "Short-Term Support",
    detail: "4-8 sessions, every two days",
    hint: "Stress, anxiety, exams, loneliness",
    fallback: 1499,
  },
  {
    key: "mediumTerm",
    title: "Medium-Term Support",
    detail: "8-15 sessions, weekly or bi-weekly",
    hint: "Mild depression, relationships, healing",
    fallback: 2499,
  },
  {
    key: "longTerm",
    title: "Long-Term Therapy",
    detail: "3-6+ months, weekly or bi-weekly",
    hint: "Trauma, severe anxiety, chronic depression",
    fallback: 3999,
  },
];

const defaultPackagePrices = packagePricePlans.reduce((acc, plan) => ({ ...acc, [plan.key]: String(plan.fallback) }), {});

function newAvailabilityRow(day = "Monday", start = "10:00", end = "16:00") {
  return { id: `${day}-${Date.now()}-${Math.random().toString(16).slice(2)}`, day, start, end };
}

function parseAvailabilityRows(items = []) {
  if (!items.length) return [newAvailabilityRow("Monday", "10:00", "16:00")];
  return items.map((item, index) => {
    const text = String(item || "");
    const match = text.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*:?\s*(\d{1,2}:?\d{0,2})\s*(?:-|–|to)\s*(\d{1,2}:?\d{0,2})/i);
    const dayMap = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
    const normalizeTime = (value, fallback) => {
      const raw = String(value || "").replace(/[^0-9:]/g, "");
      if (!raw) return fallback;
      if (raw.includes(":")) return raw.length === 4 ? `0${raw}` : raw;
      return `${raw.padStart(2, "0")}:00`;
    };
    if (!match) return newAvailabilityRow(dayOptions[index % dayOptions.length], "10:00", "16:00");
    const key = match[1].slice(0, 3).toLowerCase();
    return {
      id: `${index}-${text}`,
      day: dayMap[key] || match[1],
      start: normalizeTime(match[2], "10:00"),
      end: normalizeTime(match[3], "16:00"),
    };
  });
}

function serializeAvailabilityRows(rows = []) {
  return rows
    .filter((row) => row.day && row.start && row.end)
    .map((row) => `${row.day}: ${row.start}-${row.end}`);
}

function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function normalizePackagePrices(profile: any = {}) {
  const source = profile.supportPlanPrices || {};
  const basePrice = Number(profile.sessionPricing) || 0;
  return packagePricePlans.reduce((acc, plan) => {
    const saved = Number(source[plan.key]);
    const multiplier = plan.key === "oneTime" ? 1 : plan.key === "shortTerm" ? 3 : plan.key === "mediumTerm" ? 5 : 8;
    const fallback = saved || (basePrice ? Math.round((basePrice * multiplier) / 50) * 50 - 1 : plan.fallback);
    acc[plan.key] = String(saved > 0 ? saved : fallback || plan.fallback);
    return acc;
  }, {});
}

function fallbackBaseSessionPrice(profile: any = {}) {
  return Number(profile.sessionPricing) || (profile.counsellorType === "mentor" ? 299 : 599);
}

function counsellorPayout(value, commissionRate = 2) {
  return Math.max(0, Math.round(Number(value || 0) * ((100 - Number(commissionRate || 2)) / 100)));
}

function sessionStatusLabel(status = "") {
  if (["pending", "confirmed"].includes(status)) return "Upcoming";
  if (status === "completed") return "Completed";
  if (["cancelled", "declined"].includes(status)) return "Cancelled";
  return status || "Upcoming";
}

function counsellingModeLabel(mode = "") {
  const labels = {
    "google-meet": "Google Meet",
    "voice-call": "Voice Call",
    "in-person": "In-person",
    online: "Google Meet",
  };
  return labels[mode] || mode || "Google Meet";
}

const modeLabel = (v) => ({ "video-chat": "Video+Chat", "chat-only": "Chat Only", "google-meet": "Video", "in-person": "Visit+Video", "voice-call": "Voice" })[v] || v || "Meet";

function initials(name = "MS") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}



function normalizeNotification(item) {
  if (typeof item === "string") return { title: item.split(":")[0] || "Notice", message: item.split(":").slice(1).join(":").trim() || item };
  return item || { title: "Notice", message: "" };
}

export {
  noteTemplates,
  statusTone,
  defaultPrivacySettings,
  defaultNotificationSettings,
  dayOptions,
  packagePricePlans,
  defaultPackagePrices,
  newAvailabilityRow,
  parseAvailabilityRows,
  serializeAvailabilityRows,
  todayYMD,
  formatMoney,
  normalizePackagePrices,
  fallbackBaseSessionPrice,
  counsellorPayout,
  sessionStatusLabel,
  counsellingModeLabel,
  modeLabel,
  initials,
  normalizeNotification,
};

import { Calendar, MessageCircle, Package, Bell, BarChart3, Star, Sparkles } from "lucide-react";

const counsellingFeatures = [
  {
    icon: Calendar,
    title: "Counselling Booking System",
    description: "Users can choose a verified counsellor, select one package, and schedule Google Meet, voice, or in-person sessions.",
    features: ["One-time packages", "Flexible scheduling", "Meet integration", "Reschedule support"],
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600",
    borderColor: "border-blue-500/20",
    dotColor: "bg-blue-400",
  },
  {
    icon: MessageCircle,
    title: "Secure Counsellor Messaging",
    description: "Private follow-up conversations, care tasks, file sharing, and session reminders stay connected to booked counsellors.",
    features: ["Booked counsellor chat", "Replies and reactions", "Shared resources", "Care follow-ups"],
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600",
    borderColor: "border-violet-500/20",
    dotColor: "bg-violet-400",
  },
  {
    icon: Package,
    title: "Flexible Support Packages",
    description: "Choose from One-Time, Short-Term, Medium-Term, or Long-Term support plans that match your needs.",
    features: ["One-Time sessions", "Short-Term plans", "Medium-Term support", "Long-Term packages"],
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600",
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400",
  },
  {
    icon: Bell,
    title: "Real-time Notifications",
    description: "Instant alerts for messages, booking confirmations, session reminders, and emergency updates across devices.",
    features: ["Message alerts", "Booking confirmations", "Session reminders", "Emergency alerts"],
    gradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-600",
    borderColor: "border-sky-500/20",
    dotColor: "bg-sky-400",
  },
  {
    icon: BarChart3,
    title: "Progress Report & Analytics",
    description: "Track therapy progress with detailed session summaries, mood trends, goal milestones, and insightful visual dashboards.",
    features: ["Session summaries", "Mood trend charts", "Goal milestones", "Insights dashboard"],
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
  {
    icon: Star,
    title: "Counsellor Reviews & Ratings",
    description: "Rate your counselling experience, view detailed breakdowns, and help others find the right fit.",
    features: ["Rate counsellors", "Detailed breakdown", "Submit feedback", "Report concerns"],
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-600",
    borderColor: "border-yellow-500/20",
    dotColor: "bg-yellow-400",
  },
];

const CounsellingSupport = () => {
  return (
    <section className="bg-background py-16 md:py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-rose-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Therapy & Counselling
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Counselling &{" "}
            <span className="gradient-text">
              Therapy Support
            </span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            From choosing a verified counsellor to booking sessions, tracking assessments, and staying safe in a crisis — everything therapy-related lives here.
          </p>
        </div>

        {/* Cards Grid - 3x2 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {counsellingFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-card border border-border/60 rounded-[20px] p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`relative w-13 h-13 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 border ${feature.borderColor} shadow-lg`}
                >
                  <div className={`absolute inset-0 rounded-2xl ${feature.gradient} blur-md opacity-40`} />
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} relative z-10`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>

              {/* Feature list items */}
              <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
                {feature.features.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className={`flex h-1.5 w-1.5 rounded-full ${feature.dotColor} shrink-0`} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CounsellingSupport;

import { Brain, HeartHandshake, LifeBuoy, LockKeyhole, MessageCircle, Zap, Sparkles } from "lucide-react";

const reasons = [
  {
    title: "Smart Matching",
    text: "Tell us how you feel — we match you with counsellors trained in exactly that.",
    icon: Brain,
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600",
    borderColor: "border-violet-500/20",
    stats: "98% match accuracy",
  },
  {
    title: "Human-First Care",
    text: "Every counsellor is verified, supervised, and trained in trauma-informed care.",
    icon: HeartHandshake,
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-600",
    borderColor: "border-rose-500/20",
    stats: "All professionals verified",
  },
  {
    title: "Three Ways to Talk",
    text: "Google Meet, voice call, or in-person — switch anytime that works for you.",
    icon: MessageCircle,
    gradient: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-600",
    borderColor: "border-cyan-500/20",
    stats: "Flexible modes",
  },
  {
    title: "Radically Private",
    text: "Your sessions, notes, and identity are never shared. Anonymous mode available.",
    icon: LockKeyhole,
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-500/20",
    stats: "End-to-end encrypted",
  },
  {
    title: "Same-day Sessions",
    text: "Most counsellors offer slots within 24 hours, including evenings and weekends.",
    icon: Zap,
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600",
    borderColor: "border-amber-500/20",
    stats: "24hr availability",
  },
  {
    title: "Crisis Backup",
    text: "Free 24/7 crisis support and trained responders if you ever need urgent help.",
    icon: LifeBuoy,
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-600",
    borderColor: "border-pink-500/20",
    stats: "24/7 emergency line",
  },
];

const WhyMindSupport = () => {
  return (
    <section className="bg-background py-16 md:py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Why MindSupport
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Built around <span className="gradient-text">how you actually heal</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            From the first message to the last session — every step is designed for safety, comfort, and progress.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, i) => (
            <div
              key={reason.title}
              className="group relative bg-card border border-border/60 rounded-[20px] p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div className={`relative w-13 h-13 rounded-2xl bg-gradient-to-br ${reason.gradient} flex items-center justify-center shrink-0 border ${reason.borderColor} shadow-lg`}>
                  <div className={`absolute inset-0 rounded-2xl ${reason.gradient} blur-md opacity-40`} />
                  <reason.icon className={`h-6 w-6 ${reason.iconColor} relative z-10`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-2">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{reason.text}</p>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border/60 flex items-center gap-2">
                <span className={`flex h-2 w-2 rounded-full ${reason.iconColor.replace("text-", "bg-")}`} />
                <span className="text-xs font-medium text-muted-foreground transition-colors">{reason.stats}</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyMindSupport;
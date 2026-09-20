import { BookOpen, Users, Activity, Target, ClipboardCheck, ShieldAlert, Sparkles } from "lucide-react";

const platformFeatures = [
  {
    icon: BookOpen,
    title: "Wellness Resource Hub",
    description: "Curated videos and practical articles for motivation, stress, sleep, confidence, and self-care routines.",
    features: ["YouTube videos", "Motivation articles", "Self-care guides", "Category filters"],
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-300",
    borderColor: "border-emerald-500/20",
    dotColor: "bg-emerald-400",
  },
  {
    icon: Users,
    title: "Peer Support Network",
    description: "Anonymous, moderated community posts for students who need a safe space to share.",
    features: ["Anonymous posts", "Community support", "Safe & moderated", "Student focused"],
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-300",
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400",
  },
  {
    icon: Activity,
    title: "Mood Tracker",
    description: "Daily mood logging with visual trends to help users understand emotional patterns over time.",
    features: ["Daily mood logs", "Visual trends", "Emotional insights", "Pattern tracking"],
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-300",
    borderColor: "border-pink-500/20",
    dotColor: "bg-pink-400",
  },
  {
    icon: Target,
    title: "Goal Setting",
    description: "Set personalized wellness goals and track progress with reminders and achievement milestones.",
    features: ["Personalized goals", "Progress tracking", "Achievement milestones", "Smart reminders"],
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-300",
    borderColor: "border-violet-500/20",
    dotColor: "bg-violet-400",
  },
  {
    icon: ClipboardCheck,
    title: "Wellness Assessments",
    description: "Evidence-based PHQ-9 and GAD-7 screening tools with instant scoring and personalized recommendations.",
    features: ["PHQ-9 screening", "GAD-7 screening", "Score calculation", "Tailored recommendations"],
    gradient: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-300",
    borderColor: "border-cyan-500/20",
    dotColor: "bg-cyan-400",
  },
  {
    icon: ShieldAlert,
    title: "Crisis & Emergency Support",
    description: "Immediate SOS trigger, crisis helpline contacts, 4-7-8 breathing exercise, and grounding techniques.",
    features: ["SOS emergency trigger", "Crisis helpline numbers", "Breathing exercises", "Grounding techniques"],
    gradient: "from-rose-500/20 to-pink-500/20",
    iconColor: "text-rose-300",
    borderColor: "border-rose-500/20",
    dotColor: "bg-rose-400",
  },
];

const PlatformFeatures = () => {
  return (
    <section className="bg-[#0a0e1a] py-16 md:py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-violet-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Platform Features
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Platform Features for{" "}
            <span className="text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text">
              Everyday Wellbeing
            </span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Beyond counselling, MindSupport gives users self-help tools, community support, and progress tracking to build healthier habits every day.
          </p>
        </div>

        {/* Cards Grid - 3x2 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-[20px] p-6 hover:border-violet-500/40 hover:from-white/[0.06] hover:to-white/[0.02] transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`relative w-13 h-13 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 border ${feature.borderColor} shadow-lg`}
                >
                  <div className={`absolute inset-0 rounded-2xl ${feature.gradient} blur-md opacity-40`} />
                  <feature.icon className={`h-6 w-6 ${feature.iconColor} relative z-10`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>

              {/* Feature list items */}
              <div className="mt-5 pt-4 border-t border-white/[0.06] space-y-2">
                {feature.features.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
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

export default PlatformFeatures;

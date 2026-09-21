import { Activity, BookOpen, Calendar, ClipboardCheck, Heart, MessageCircle, Package, Star, Target, Users, Check } from "lucide-react";
import ElectricBorder from "@/mind/components/reactbits/ElectricBorder";

const mainFeatures = [
  {
    icon: MessageCircle,
    title: "Secure Counsellor Messaging",
    description: "Private follow-up conversations, care tasks, file sharing, and session reminders stay connected to booked counsellors.",
    features: ["Booked counsellor chat", "Replies and reactions", "Shared resources", "Care follow-ups"],
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-300",
  },
  {
    icon: Calendar,
    title: "Counselling Booking System",
    description: "Users can choose a verified counsellor, select one package, and schedule Google Meet, voice, or in-person sessions.",
    features: ["One-time packages", "Flexible scheduling", "Meet integration", "Reschedule support"],
    gradient: "from-cyan-500/20 to-blue-500/20",
    iconColor: "text-cyan-300",
  },
  {
    icon: BookOpen,
    title: "Wellness Resource Hub",
    description: "Curated videos and practical articles for motivation, stress, sleep, confidence, and self-care routines.",
    features: ["YouTube videos", "Motivation articles", "Self-care guides", "Category filters"],
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-300",
  },
  {
    icon: Users,
    title: "Peer Support Network",
    description: "Anonymous, moderated community posts for students who need a safe space to share.",
    features: ["Anonymous posts", "Community support", "Safe & moderated", "Student focused"],
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-300",
  },
  {
    icon: Activity,
    title: "Mood Tracker",
    description: "Daily mood logging with visual trends to help users understand emotional patterns over time.",
    features: ["Daily mood logs", "Visual trends", "Emotional insights", "Pattern tracking"],
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-300",
  },
  {
    icon: Target,
    title: "Goal Setting",
    description: "Set personalized wellness goals and track progress with reminders and achievement milestones.",
    features: ["Personalized goals", "Progress tracking", "Achievement milestones", "Smart reminders"],
    gradient: "from-yellow-500/20 to-amber-500/20",
    iconColor: "text-yellow-300",
  },
  {
    icon: ClipboardCheck,
    title: "Wellness Assessments",
    description: "Evidence-based PHQ-9 and GAD-7 screening tools with instant scoring and personalized recommendations.",
    features: ["PHQ-9 screening", "GAD-7 screening", "Score calculation", "Tailored recommendations"],
    gradient: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-300",
  },
  {
    icon: Heart,
    title: "Crisis & Emergency Support",
    description: "Immediate SOS trigger, crisis helpline contacts, 4-7-8 breathing exercise, and grounding techniques.",
    features: ["SOS emergency trigger", "Crisis helpline numbers", "Breathing exercises", "Grounding techniques"],
    gradient: "from-red-500/20 to-rose-500/20",
    iconColor: "text-red-300",
  },
  {
    icon: Package,
    title: "Flexible Support Packages",
    description: "Choose from One-Time, Short-Term, Medium-Term, or Long-Term support plans that match your needs.",
    features: ["One-Time sessions", "Short-Term plans", "Medium-Term support", "Long-Term packages"],
    gradient: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-300",
  },
  {
    icon: Star,
    title: "Counsellor Reviews & Ratings",
    description: "Rate your counselling experience, view detailed breakdowns, and help others find the right fit.",
    features: ["Rate counsellors", "Detailed breakdown", "Submit feedback", "Report concerns"],
    gradient: "from-orange-500/20 to-amber-500/20",
    iconColor: "text-orange-300",
  },
];

const Features = () => {
  return (
    <section id="features" className="animated-hero-bg relative overflow-hidden bg-[#050914] py-20 md:py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-cyan-500/8" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ElectricBorder color="#22d3ee" speed={0.72} chaos={0.07} borderRadius={28} className="block" style={{ borderRadius: 28 }}>
          <div className="rounded-[28px] border border-cyan-300/10 bg-[#07101f]/90 p-5 shadow-[0_28px_80px_rgba(8,13,32,0.34)] backdrop-blur md:p-8 lg:p-10">
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {mainFeatures.map((feature) => (
                <article
                  key={feature.title}
                  className="group premium-hover-card dashboard-card-motion rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-5 shadow-[0_18px_48px_rgba(4,7,18,0.28)] hover:border-violet-500/30 hover:-translate-y-0.5 transition-all duration-500"
                >
                  <div className="flex items-start gap-4">
                    <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shrink-0 border border-white/10 shadow-lg`}>
                      <div className={`absolute inset-0 rounded-2xl ${feature.gradient} blur-md opacity-40`} />
                      <feature.icon className={`h-6 w-6 ${feature.iconColor} relative z-10`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300/75">{feature.description}</p>
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    {feature.features.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-slate-400">
                        <Check className={`h-4 w-4 ${feature.iconColor} shrink-0`} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </ElectricBorder>
      </div>
    </section>
  );
};

export default Features;

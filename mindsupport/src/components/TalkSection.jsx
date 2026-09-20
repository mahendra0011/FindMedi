import { Video, Phone, MapPin, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const talkOptions = [
  {
    id: "google-meet",
    icon: Video,
    badge: "Most popular",
    title: "Google Meet",
    description: "HD video sessions from anywhere. Encrypted, no recording stored.",
    features: ["Encrypted HD video", "No recording", "Screen sharing ready", "Join from any device"],
    gradient: "from-blue-500/20 via-[#0b1020] to-cyan-500/10",
    borderGlow: "#3b82f6",
    buttonText: "Start Video Call",
    glowColor: "rgba(59,130,246,0.15)",
    accentColor: "text-blue-400",
  },
  {
    id: "voice-call",
    icon: Phone,
    badge: "Low bandwidth",
    title: "Voice Call",
    description: "Audio-only support when you need to close your eyes and talk.",
    features: ["Audio-only mode", "Low data usage", "Hands-free comfort", "Works on weak networks"],
    gradient: "from-emerald-500/15 via-[#0b1020] to-teal-500/10",
    borderGlow: "#10b981",
    buttonText: "Start Voice Call",
    glowColor: "rgba(16,185,129,0.15)",
    accentColor: "text-emerald-400",
  },
  {
    id: "in-person",
    icon: MapPin,
    badge: "Select cities",
    title: "In-person",
    description: "Meet at a verified clinic in supported cities.",
    features: ["Verified clinics", "Safe environment", "In-person support", "Professional setting"],
    gradient: "from-amber-500/15 via-[#0b1020] to-orange-500/10",
    borderGlow: "#f59e0b",
    buttonText: "Find Clinic",
    glowColor: "rgba(245,158,11,0.15)",
    accentColor: "text-amber-400",
  },
];

const iconMap = {
  "google-meet": Video,
  "voice-call": Phone,
  "in-person": MapPin,
};

const TalkSection = () => {
  const handleSelect = (mode) => {
    window.location.href = `/counselling?mode=${mode}`;
  };

  return (
    <section id="talk" className="relative overflow-hidden bg-[#050914] py-20 md:py-24">
      {/* Sophisticated animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5" />
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[120px] animate-pulse-slow animation-delay-2000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[180px] animate-pulse-slow animation-delay-4000" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-5 py-2 text-sm font-medium text-cyan-300 backdrop-blur-sm shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            <Sparkles className="h-4 w-4" />
            Choose Your Mode
          </div>
          <h2 className="mt-6 text-3xl font-bold leading-tight md:text-5xl">
            <span className="bg-gradient-to-r from-white via-violet-100 to-cyan-200 bg-clip-text text-transparent">
              Talk however feels right
            </span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base leading-8 text-slate-300/75">
            Select the mode that works best for you. All sessions are confidential and conducted by verified professionals.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {talkOptions.map((option, index) => {
            const Icon = iconMap[option.id];
            return (
              <div
                key={option.id}
                className="group relative rounded-[24px] transition-all duration-500 hover:scale-[1.03]"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Animated glow behind card */}
                <div
                  className="absolute -inset-[2px] rounded-[26px] opacity-0 blur-xl transition-all duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(ellipse at center, ${option.glowColor} 0%, transparent 70%)`,
                  }}
                />

                {/* Border glow on hover */}
                <div
                  className="absolute -inset-[1px] rounded-[25px] opacity-0 transition-all duration-500 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(135deg, ${option.borderGlow}88 0%, transparent 50%, ${option.borderGlow}44 100%)`,
                  }}
                />

                {/* Main card */}
                <div
                  className="relative h-full rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-[1px] transition-all duration-500 group-hover:border-transparent"
                >
                  <div className="h-full rounded-[23px] bg-[#0a0e1a] p-7 transition-all duration-500 group-hover:bg-[#0d1225]">
                    {/* Badge row */}
                    <div className="mb-5 flex items-center justify-between">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300"
                        style={{
                          borderColor: `${option.borderGlow}44`,
                          color: option.accentColor,
                          backgroundColor: `${option.borderGlow}15`,
                        }}
                      >
                        {option.badge === "Most popular" && <Sparkles className="h-3 w-3" />}
                        {option.badge}
                      </span>
                      {option.id === "google-meet" && (
                        <span className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/60">
                          Recommended
                        </span>
                      )}
                    </div>

                    {/* Icon with glow */}
                    <div className="relative mb-5 inline-flex">
                      <div
                        className="absolute inset-0 rounded-2xl blur-lg transition-all duration-500 group-hover:blur-xl"
                        style={{ backgroundColor: option.glowColor }}
                      />
                      <div
                        className="relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-500 group-hover:scale-110"
                        style={{
                          backgroundColor: `${option.borderGlow}15`,
                          borderColor: `${option.borderGlow}30`,
                        }}
                      >
                        <Icon className={`h-7 w-7 ${option.accentColor} drop-shadow-[0_0_8px_${option.borderGlow}88]`} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="mb-2 text-xl font-bold text-white transition-all duration-300 group-hover:tracking-wide">
                      {option.title}
                    </h3>

                    {/* Description */}
                    <p className="mb-6 text-sm leading-relaxed text-slate-400 transition-all duration-300 group-hover:text-slate-300">
                      {option.description}
                    </p>

                    {/* Features */}
                    <div className="mb-7 space-y-2.5">
                      {option.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2.5 text-sm text-slate-400 transition-all duration-300 group-hover:text-slate-300">
                          <CheckCircle className={`h-4 w-4 shrink-0 transition-all duration-300 group-hover:scale-110 ${option.accentColor}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Button */}
                    <Button
                      onClick={() => handleSelect(option.id)}
                      className="w-full gap-2 rounded-xl border border-[#00bfff]/40 bg-[#00bfff]/20 py-6 font-semibold text-white backdrop-blur transition-all duration-300 hover:bg-[#00bfff]/30 hover:border-[#00bfff]/60 hover:text-white"
                    >
                      {option.buttonText}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TalkSection;
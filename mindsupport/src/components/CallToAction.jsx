import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, HeartHandshake, CheckCircle2, Shield, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import ElectricBorder from "@/components/reactbits/ElectricBorder";

const CallToAction = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-background pb-20 pt-6 relative overflow-hidden">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8 relative">
        <ElectricBorder color="#22d3ee" speed={0.72} chaos={0.07} borderRadius={28} className="block" style={{ borderRadius: 28 }}>
          <div className="rounded-[28px] px-6 py-16 text-center md:px-10 relative overflow-hidden bg-[#0f1729]" data-motion>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/25 backdrop-blur-sm mb-6">
                <HeartHandshake className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground/80">Start your journey</span>
              </div>

              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-foreground">
                Take the{" "}
                <span className="motion-gradient-aura gradient-text">first step</span>{" "}
                today
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-foreground/70">
                The hardest part is starting. Browse counsellors, pick someone who feels right, and book in under 2 minutes.
              </p>

              <div className="mt-8 flex items-center justify-center gap-3 text-xs text-foreground/60">
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> Free to join</span>
                <span className="w-1 h-1 rounded-full bg-foreground/20" />
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-secondary" /> No commitment</span>
                <span className="w-1 h-1 rounded-full bg-foreground/20" />
                <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-accent" /> 100% private</span>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button className="bg-gradient-primary hover:opacity-90 px-8 py-6 text-sm font-bold text-white shadow-lg shadow-primary/25 glow-primary pulse-glow group" onClick={() => navigate("/counselling")}>
                  Find My Counsellor
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="outline"
                  className="border-glass-border/50 hover:bg-glass/30 backdrop-blur-sm px-8 py-6 text-sm font-bold text-foreground hover:text-foreground"
                  onClick={() => navigate("/counselling")}
                >
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  Compare Plans
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-glass-border/20">
                <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-foreground/50">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Licensed professionals
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
                    End-to-end encrypted
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    Cancel anytime
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ElectricBorder>
      </div>
    </section>
  );
};

export default CallToAction;
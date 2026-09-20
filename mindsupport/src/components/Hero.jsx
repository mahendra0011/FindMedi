import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Heart } from "lucide-react";
import heroImage from "@/assets/hero-mental-health.jpg";
import { useNavigate } from "react-router-dom";
const Hero = () => {
    const navigate = useNavigate();
    return (<section className="animated-hero-bg min-h-screen flex items-center justify-center bg-gradient-hero pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="space-y-8" data-motion>
            <div className="space-y-4">
              <div className="premium-hover-card inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-glass/50 border border-glass-border/30 backdrop-blur-sm">
                <Shield className="h-4 w-4 text-accent"/>
                <span className="text-sm text-foreground/80">Confidential & Secure</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="motion-gradient-aura gradient-text">Digital Mental Health</span>
                <br />
                <span className="text-foreground">Support System</span>
              </h1>
              
              <p className="text-xl text-foreground/70 max-w-2xl leading-relaxed">
                A confidential mental health support platform designed specifically for students in higher education.
                Book counsellor sessions, access resources, and connect with peers in a secure environment.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/20 glow-primary">
                  <Zap className="h-5 w-5 text-primary"/>
                </div>
                <span className="text-foreground/80">Counsellor-Led Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-secondary/20 glow-purple">
                  <Heart className="h-5 w-5 text-secondary"/>
                </div>
                <span className="text-foreground/80">24/7 Availability</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="motion-button bg-gradient-primary hover:opacity-90 text-lg px-8 py-4 glow-primary pulse-glow group" onClick={() => navigate("/counselling")}>
                Find Counsellor
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"/>
              </Button>
              <Button variant="outline" size="lg" className="motion-button text-lg px-8 py-4 border-glass-border/50 hover:bg-glass/30 backdrop-blur-sm" onClick={() => navigate("/counselling")}>
                View Support Plans
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-glass-border/30">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">24/7</div>
                <div className="text-sm text-foreground/60">Available</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">Human-Led</div>
                <div className="text-sm text-foreground/60">Care</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">Secure</div>
                <div className="text-sm text-foreground/60">& Private</div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative px-3 sm:px-6 lg:px-0" data-motion>
            <div className="premium-hover-card glass-card p-8 animate-float">
              <img src={heroImage} alt="Digital Mental Health Platform Visualization" className="w-full h-auto rounded-lg shadow-2xl"/>
              <div className="absolute inset-0 bg-gradient-primary/10 rounded-lg"></div>
            </div>
            
            {/* Floating Elements */}
            <div className="premium-hover-card !absolute -top-6 right-6 z-20 inline-flex w-max max-w-[calc(100%-3rem)] whitespace-nowrap glass-card p-4 animate-float-delayed sm:right-10 lg:-top-8 lg:right-2">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-foreground/80">Online Support</span>
              </div>
            </div>
            
            <div className="premium-hover-card !absolute -bottom-6 left-6 z-20 inline-flex w-max max-w-[calc(100%-3rem)] whitespace-nowrap glass-card p-4 animate-float sm:left-10 lg:-bottom-7 lg:-left-5">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-primary"/>
                <span className="text-sm text-foreground/80">100% Confidential</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);
};
export default Hero;

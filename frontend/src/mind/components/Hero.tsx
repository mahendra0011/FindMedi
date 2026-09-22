import { motion } from "framer-motion";
import { Button } from "@/mind/components/ui/button";
import { ArrowRight, Shield, Zap, Heart } from "lucide-react";
import heroImage from "@/mind/assets/hero-mental-health.jpg";
import { useNavigate } from "react-router-dom";
import SplitText from "@/mind/components/reactbits/SplitText";
import BlurText from "@/mind/components/reactbits/BlurText";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }
  })
};

const Hero = () => {
    const navigate = useNavigate();
    return (<section className="animated-hero-bg min-h-screen flex items-center justify-center bg-gradient-hero pt-16 relative overflow-hidden">
      {/* FindMedi-style animated aura blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 -right-1/4 w-[560px] h-[560px] rounded-full bg-gradient-to-bl from-secondary/20 to-transparent blur-3xl"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div initial="hidden" animate="visible" className="space-y-8">
            <div className="space-y-4">
              <motion.div variants={fadeUp} custom={0} className="premium-hover-card inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-glass/50 border border-glass-border/30 backdrop-blur-sm">
                <Shield className="h-4 w-4 text-primary"/>
                <span className="text-sm text-foreground/80">Confidential & Secure</span>
              </motion.div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <SplitText
                  tag="span"
                  text="Digital Mental Health"
                  className="block motion-gradient-aura mindsupport-split-gradient"
                  delay={34}
                  duration={0.72}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 46 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.2}
                  rootMargin="0px"
                  textAlign="left"
                />
                <SplitText
                  tag="span"
                  text="Support System"
                  className="block"
                  delay={26}
                  duration={0.7}
                  ease="power3.out"
                  splitType="words,chars"
                  from={{ opacity: 0, y: 42 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.2}
                  rootMargin="0px"
                  textAlign="left"
                />
              </h1>

              <BlurText
                text="A confidential mental health support platform designed specifically for students in higher education. Book counsellor sessions, access resources, and connect with peers in a secure environment."
                delay={55}
                animateBy="words"
                direction="bottom"
                threshold={0.2}
                rootMargin="0px"
                stepDuration={0.34}
                className="text-xl text-foreground/70 max-w-2xl leading-relaxed"
              />
            </div>

            {/* Features */}
            <motion.div variants={fadeUp} custom={2} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-primary/20 glow-primary">
                  <Zap className="h-5 w-5 text-primary"/>
                </div>
                <span className="text-foreground/80">Counsellor-Led Support</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-secondary/20 glow-purple">
                  <Heart className="h-5 w-5 text-primary"/>
                </div>
                <span className="text-foreground/80">24/7 Availability</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="motion-button bg-gradient-primary hover:opacity-90 text-lg px-8 py-4 glow-primary pulse-glow group" onClick={() => navigate("/mind/counselling")}>
                Find Counsellor
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform"/>
              </Button>
              <Button variant="outline" size="lg" className="motion-button text-lg px-8 py-4 border-glass-border/50 hover:bg-glass/30 backdrop-blur-sm" onClick={() => navigate("/mind/counselling")}>
                View Support Plans
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={fadeUp} custom={4} className="grid grid-cols-3 gap-8 pt-8 border-t border-glass-border/30">
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
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative px-3 sm:px-6 lg:px-0"
          >
            <motion.div
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="premium-hover-card glass-card p-8"
            >
              <img src={heroImage} alt="Digital Mental Health Platform Visualization" className="w-full h-auto rounded-lg shadow-2xl"/>
              <div className="absolute inset-0 bg-gradient-primary/10 rounded-lg"></div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="premium-hover-card !absolute -top-6 right-6 z-20 inline-flex w-max max-w-[calc(100%-3rem)] whitespace-nowrap glass-card p-4 sm:right-10 lg:-top-8 lg:right-2"
            >
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm text-foreground/80">Online Support</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="premium-hover-card !absolute -bottom-6 left-6 z-20 inline-flex w-max max-w-[calc(100%-3rem)] whitespace-nowrap glass-card p-4 sm:left-10 lg:-bottom-7 lg:-left-5"
            >
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-primary"/>
                <span className="text-sm text-foreground/80">100% Confidential</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>);
};
export default Hero;

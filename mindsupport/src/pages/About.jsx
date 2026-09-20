import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, HeartHandshake, Sparkles, CheckCircle2, Lock, Users, Star, BookOpen, Zap, Clock, Eye, Target, Quote, Calendar, GraduationCap, BriefcaseBusiness, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import founderImg from "@/assets/profile-yes2-BIKHBByD.png";

const values = [
  { icon: Lock, title: "Confidentiality First", desc: "Every session, every message, every detail — protected. Always.", color: "from-violet-500/20 to-purple-500/10", iconColor: "text-violet-400", border: "border-violet-500/20" },
  { icon: HeartHandshake, title: "Accessibility", desc: "Support shouldn't depend on how much free time or money you have. Our package model makes help reachable.", color: "from-emerald-500/20 to-green-500/10", iconColor: "text-emerald-400", border: "border-emerald-500/20" },
  { icon: Shield, title: "Verified Expertise", desc: "Every counselor on MindSupport goes through a verification process, so you know you're talking to someone qualified.", color: "from-blue-500/20 to-cyan-500/10", iconColor: "text-blue-400", border: "border-blue-500/20" },
  { icon: HeartHandshake, title: "Judgment-Free Space", desc: "Whatever you're going through, you're not 'too much' or 'not enough' here. Come as you are.", color: "from-rose-500/20 to-pink-500/10", iconColor: "text-rose-400", border: "border-rose-500/20" },
  { icon: Clock, title: "Flexibility", desc: "Life doesn't run on a fixed schedule, and neither should your support system.", color: "from-amber-500/20 to-orange-500/10", iconColor: "text-amber-400", border: "border-amber-500/20" },
  { icon: Eye, title: "Transparency", desc: "Clear pricing, verified profiles, and honest communication — no hidden fees, no surprises.", color: "from-cyan-500/20 to-teal-500/10", iconColor: "text-cyan-400", border: "border-cyan-500/20" },
];

const steps = [
  { num: "01", title: "Browse Counselors", desc: "Explore verified counselors by specialization, experience, and approach.", icon: Users },
  { num: "02", title: "Choose a Package", desc: "Pick a single session or an ongoing plan that matches your needs and budget.", icon: Sparkles },
  { num: "03", title: "Book On Your Time", desc: "Schedule sessions around your life, not the other way around.", icon: Calendar },
  { num: "04", title: "Talk, Heal, Grow", desc: "Connect in a safe, confidential space built for real conversations.", icon: HeartHandshake },
];

const comparisonData = [
  { traditional: "Confusing directories", mindsupport: "Clear, verified counselor profiles" },
  { traditional: "Unclear or hidden pricing", mindsupport: "Transparent, package-based pricing" },
  { traditional: "Long waitlists", mindsupport: "Quick, easy booking" },
  { traditional: "Rigid subscriptions", mindsupport: "Choose exactly the support level you need" },
];

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="bg-primary/15 text-primary border border-primary/25 mb-6 px-4 py-2 text-sm">
                <HeartHandshake className="h-4 w-4 mr-2" />
                About MindSupport
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
                Mental wellness support,{" "}
                <span className="motion-gradient-aura gradient-text">made simple.</span>
              </h1>
              <p className="text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed">
                MindSupport connects you with verified counselors through flexible, package-based sessions — 
                no long searches, no confusing subscriptions, no judgment. Just support, on your terms.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button className="bg-gradient-primary hover:opacity-90 px-8 py-6 text-base font-bold text-white shadow-lg shadow-primary/25 glow-primary pulse-glow group" onClick={() => navigate("/counselling")}>
                  Find a Counsellor
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" className="border-glass-border/50 hover:bg-glass/30 backdrop-blur-sm px-8 py-6 text-base font-bold" onClick={() => navigate("/resources")}>
                  <BookOpen className="mr-2 h-5 w-5 text-primary" />
                  Explore Resources
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Meet Our Founder */}
        <section className="relative py-10 md:py-14">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1">
                <Badge className="bg-primary/15 text-primary border border-primary/25 mb-3">
                  <Star className="h-3 w-3 mr-1" />
                  Meet Our Founder
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-1">
                  Mahendra <span className="motion-gradient-aura gradient-text">Prajapati</span>
                </h2>
                <p className="text-base text-foreground/60 mb-4">Founder & Full Stack Developer</p>
                <div className="space-y-3 text-foreground/70 leading-relaxed text-sm md:text-base">
                  <p>
                    Mahendra Prajapati is a passionate Freelance Full Stack Web Developer dedicated to building reliable, scalable, secure, and user-focused digital products. With expertise in React.js, Node.js, Express.js, MongoDB, REST APIs, Docker, and AWS, he specializes in creating clean user experiences backed by secure, production-ready systems.
                  </p>
                  <p>
                    Having built multiple full-stack projects — including business platforms, booking systems, dashboards, and management solutions — Mahendra brings that same engineering discipline to MindSupport. His goal is simple: build technology that works efficiently and delivers real value to the people who use it.
                  </p>
                  <p>
                    MindSupport was born from this same vision — creating a secure, reliable, and thoughtfully designed platform where mental health support is accessible, private, and genuinely helpful for everyone who needs it.
                  </p>
                </div>
              </div>
              <div className="order-1 lg:order-2 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-3 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 rounded-2xl blur-2xl" />
                  <div className="relative glass-card rounded-2xl overflow-hidden border border-glass-border/30 p-2">
                    <img 
                      src={founderImg} 
                      alt="Mahendra Prajapati - Founder & Full Stack Developer" 
                      className="w-full max-w-xs h-auto rounded-xl object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://ui-avatars.com/api/?name=Mahendra+Prajapati&background=7c3aed&color=fff&size=400&bold=true&format=png";
                      }}
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="relative py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/25 mb-4">Our Story</Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Why we built{" "}
                  <span className="motion-gradient-aura gradient-text">MindSupport</span>
                </h2>
                <div className="space-y-4 text-foreground/70 leading-relaxed">
                  <p>
                    Finding the right mental health support often feels harder than it should be. 
                    Endless directories, unclear pricing, counselors who don't specialize in what you're going through, 
                    and booking systems that feel more like a hassle than a help.
                  </p>
                  <p>
                    MindSupport was built to change that. We wanted a platform where someone going through a rough patch 
                    — a student overwhelmed before exams, a professional burning out, someone who just needs to talk to 
                    a person who understands — could find the right counselor in minutes, not weeks.
                  </p>
                  <p>
                    So we built a system around packages instead of rigid subscriptions. Because mental health support 
                    isn't one-size-fits-all, and neither should be the way you pay for it.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="glass-card rounded-2xl p-8 border border-glass-border/30">
                  <Quote className="h-8 w-8 text-primary/40 mb-4" />
                  <p className="text-lg text-foreground/80 leading-relaxed italic mb-6">
                    "Mental health support isn't one-size-fits-all, and neither should be the way you pay for it."
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-glass-border/30">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-white">
                      MS
                    </div>
                    <div>
                      <p className="text-sm font-semibold">MindSupport Team</p>
                      <p className="text-xs text-foreground/50">Founded 2024</p>
                    </div>
                  </div>
                </div>
                {/* Floating stat */}
                <div className="absolute -bottom-4 -right-4 glass-card rounded-xl p-4 border border-glass-border/30 hidden md:block">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                      <Users className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">100+</p>
                      <p className="text-xs text-foreground/50">Verified Counselors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass-card rounded-2xl p-8 border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-500" />
                <div className="relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/25 mb-4">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Our Mission</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    To make quality mental health support accessible, transparent, and genuinely easy to reach 
                    — for anyone who needs it, whenever they need it.
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-8 border border-secondary/20 bg-gradient-to-br from-secondary/10 via-secondary/5 to-background relative overflow-hidden group hover:shadow-lg hover:shadow-secondary/5 transition-all duration-300">
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-secondary/10 blur-2xl group-hover:bg-secondary/20 transition-all duration-500" />
                <div className="relative z-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 border border-secondary/25 mb-4">
                    <Eye className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">Our Vision</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    A world where reaching out for mental health support carries the same ease and acceptance 
                    as booking a regular check-up. Where seeking help is normal, not something to hide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="relative py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-primary/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <Badge className="bg-accent/15 text-accent border border-accent/25 mb-4">How It Works</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Your journey to{" "}
                <span className="motion-gradient-aura gradient-text">better mental health</span>
              </h2>
              <p className="text-foreground/70 max-w-xl mx-auto">Four simple steps to get the support you need.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, i) => (
                <div key={step.title} className="glass-card rounded-2xl p-6 border border-glass-border/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-sm font-bold text-white">
                      {step.num}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 mb-4 group-hover:bg-primary/20 transition-all">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <Badge className="bg-primary/15 text-primary border border-primary/25 mb-4">
                <Star className="h-3.5 w-3.5 mr-1" />
                Core Values
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                What we stand{" "}
                <span className="motion-gradient-aura gradient-text">for</span>
              </h2>
              <p className="text-foreground/70 max-w-xl mx-auto">The principles that guide everything we do.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((v) => (
                <div key={v.title} className={`glass-card rounded-2xl p-6 border ${v.border} bg-gradient-to-br ${v.color} hover:shadow-lg transition-all duration-300 group`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-background/60 border ${v.border} mb-4 group-hover:scale-110 transition-transform`}>
                    <v.icon className={`h-6 w-6 ${v.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{v.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="relative py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/25 mb-4">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                What Makes Us Different
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Traditional therapy vs{" "}
                <span className="motion-gradient-aura gradient-text">MindSupport</span>
              </h2>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="glass-card rounded-2xl overflow-hidden border border-glass-border/30">
                <div className="grid grid-cols-2 border-b border-glass-border/30">
                  <div className="p-4 bg-primary/10 font-bold text-foreground/80">Traditional Therapy Search</div>
                  <div className="p-4 bg-accent/10 font-bold text-foreground/80">MindSupport</div>
                </div>
                {comparisonData.map((row, i) => (
                  <div key={i} className={`grid grid-cols-2 border-b border-glass-border/20 ${i % 2 === 0 ? 'bg-background/40' : 'bg-background/20'}`}>
                    <div className="p-4 text-sm text-foreground/60 flex items-center gap-2">
                      <X className="h-4 w-4 text-rose-500 shrink-0" />
                      {row.traditional}
                    </div>
                    <div className="p-4 text-sm text-foreground/80 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {row.mindsupport}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Safety & Privacy */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-2xl p-8 md:p-12 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-background relative overflow-hidden">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative z-10 max-w-3xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 mb-6">
                  <Shield className="h-7 w-7 text-emerald-400" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Safety, Privacy & Confidentiality</h2>
                <p className="text-foreground/70 leading-relaxed mb-6">
                  We know that trust is everything when it comes to mental health. Every conversation on MindSupport 
                  is private and secure, your personal data is never shared without consent, and you're always in 
                  control of your information.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 px-3 py-1.5">
                    <Lock className="h-3.5 w-3.5 mr-1" /> End-to-end encrypted
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 px-3 py-1.5">
                    <Shield className="h-3.5 w-3.5 mr-1" /> Private & secure
                  </Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Your data, your control
                  </Badge>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-500/80">
                    <strong>Note:</strong> MindSupport is a counseling and wellness support platform, not an emergency service. 
                    If you're in immediate crisis, please reach out to a local emergency helpline first.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="relative py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 via-transparent to-primary/5 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <Badge className="bg-secondary/15 text-secondary border border-secondary/25 mb-4">
                <Users className="h-3.5 w-3.5 mr-1" />
                Who It's For
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Built for{" "}
                <span className="motion-gradient-aura gradient-text">everyone</span>
              </h2>
              <p className="text-foreground/70 max-w-2xl mx-auto">
                MindSupport is for anyone who believes their mental health deserves real attention.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: GraduationCap, title: "Students", desc: "Navigating academic pressure, exam stress, and the challenges of student life.", color: "from-violet-500/20 to-purple-500/10", border: "border-violet-500/20" },
                { icon: BriefcaseBusiness, title: "Professionals", desc: "Managing burnout, work stress, and finding balance in a demanding career.", color: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/20" },
                { icon: HeartHandshake, title: "Everyone", desc: "Dealing with anxiety, relationship struggles, grief, or simply needing someone to talk to.", color: "from-emerald-500/20 to-green-500/10", border: "border-emerald-500/20" },
              ].map((item) => (
                <div key={item.title} className={`glass-card rounded-2xl p-6 border ${item.border} bg-gradient-to-br ${item.color} hover:shadow-lg transition-all duration-300 text-center`}>
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-background/60 border border-glass-border/30 mx-auto mb-4">
                    <item.icon className="h-7 w-7 text-foreground/80" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Promise */}
        <section className="relative py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-2xl p-8 md:p-12 text-center border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
              <div className="relative z-10">
                <Badge className="bg-primary/15 text-primary border border-primary/25 mb-4 px-4 py-2">
                  <HeartHandshake className="h-4 w-4 mr-2" />
                  Our Promise
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Your mental health{" "}
                  <span className="motion-gradient-aura gradient-text">matters</span>
                </h2>
                <p className="text-foreground/70 max-w-2xl mx-auto text-lg leading-relaxed mb-8">
                  Your mental health matters, and so does how you're treated while taking care of it. 
                  Every counselor, every session, every interaction on MindSupport is held to that standard.
                </p>
                <Button className="bg-gradient-primary hover:opacity-90 px-8 py-6 text-base font-bold text-white shadow-lg shadow-primary/25 glow-primary pulse-glow group" onClick={() => navigate("/counselling")}>
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
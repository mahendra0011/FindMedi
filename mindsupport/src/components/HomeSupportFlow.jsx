import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HeartHandshake, MapPin, MessageCircle, Phone, Search, Star, Video, ArrowRight, LifeBuoy, Sparkles, SlidersHorizontal, Languages, IndianRupee, TrendingUp, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ElectricBorder from "@/components/reactbits/ElectricBorder";

function avatarUrl(name = "") {
  const encoded = encodeURIComponent(name || "User");
  const colors = ["7c3aed", "0891b2", "059669", "d97706", "dc2626", "db2777", "7c3aed", "2563eb"];
  const colorIndex = (name || "").length % colors.length;
  return `https://ui-avatars.com/api/?name=${encoded}&background=${colors[colorIndex]}&color=fff&size=400&bold=true&format=png`;
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "MS";
}

const featuredCounsellors = [
  { name: "Dr. Aisha Mehra", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&auto=format", role: "Anxiety and Stress Management", rating: "4.9", reviews: "128", bio: "Licensed psychologist helping students manage anxiety, panic, exam stress, and emotional overwhelm with practical coping plans.", tags: ["Anxiety", "Stress", "Student Pressure"], exp: "8 years exp", location: "Mumbai", language: "English / Hindi", price: "₹1,799" },
  { name: "Dr. Arjun Sen", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face&auto=format", role: "Sleep, Burnout and Workload Balance", rating: "4.8", reviews: "119", bio: "Professional psychologist helping students and early professionals with burnout, sleep routines, stress recovery, and boundaries.", tags: ["Sleep", "Burnout", "Career Stress"], exp: "9 years exp", location: "Kolkata", language: "English / Bengali / Hindi", price: "₹1,499" },
  { name: "Dr. Neha Iyer", image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face&auto=format", role: "Depression and Mood Support", rating: "4.8", reviews: "142", bio: "Professional counsellor supporting low mood, loneliness, grief, emotional numbness, and therapy progress tracking.", tags: ["Depression", "Loneliness", "General"], exp: "10 years exp", location: "Chennai", language: "English / Tamil", price: "₹1,649" },
  { name: "Dr. Priya Nair", image: "https://images.unsplash.com/photo-1587614382344-4ecb093b79b2?w=400&h=400&fit=crop&crop=face&auto=format", role: "Trauma Support and Grounding", rating: "4.9", reviews: "166", bio: "Trauma-informed therapist helping clients with grounding, safety planning, triggers, PTSD symptoms, and emotional regulation.", tags: ["Trauma Support", "PTSD", "Anxiety"], exp: "12 years exp", location: "Kochi", language: "English / Malayalam / Hindi", price: "₹1,799" },
  { name: "Kabir Khan", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&auto=format", role: "Addiction Recovery Peer Support", rating: "4.6", reviews: "74", bio: "Peer support mentor for recovery routines, relapse prevention habits, accountability, and rebuilding confidence.", tags: ["Addiction Recovery", "Stress", "Motivation"], exp: "6 years exp", location: "Hyderabad", language: "English / Hindi / Urdu", price: "₹749" },
  { name: "Meera Shah", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&auto=format", role: "Meditation and Emotional Balance", rating: "4.8", reviews: "91", bio: "Mindfulness mentor teaching simple meditation, breathing routines, gratitude practice, and calm daily habits.", tags: ["Meditation", "Stress", "General"], exp: "7 years exp", location: "Ahmedabad", language: "English / Gujarati / Hindi", price: "₹749" },
  { name: "Rahul Verma", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face&auto=format", role: "Career Pressure and Confidence", rating: "4.7", reviews: "86", bio: "Community mentor focused on career stress, self-confidence, interview pressure, and small-step motivation for students.", tags: ["Career Stress", "Self Confidence", "Motivation"], exp: "5 years exp", location: "Pune", language: "English / Hindi / Marathi", price: "₹899" },
  { name: "Sana Qureshi", image: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=face&auto=format", role: "Relationship and Breakup Recovery", rating: "4.7", reviews: "63", bio: "Community mentor supporting breakup recovery, relationship boundaries, loneliness, and rebuilding daily stability.", tags: ["Relationships", "Loneliness", "Self Confidence"], exp: "4 years exp", location: "Delhi NCR", language: "English / Hindi", price: "₹599" },
];

const allCategories = ["All", "Anxiety", "Stress", "Student Pressure", "Exam pressure", "Loneliness", "Mild depression", "Relationship issues", "Emotional healing", "Trauma", "Sleep", "Burnout", "Career Stress", "Addiction Recovery", "Meditation", "Self Confidence", "Motivation"];

const steps = [
  { title: "Choose a counsellor", text: "Filter by specialty, language, location, and experience.", icon: Search },
  { title: "Pick a therapy plan", text: "Short, medium, or long-term support - your call.", icon: HeartHandshake },
  { title: "Book your session", text: "Google Meet, voice call, or in-person, on your schedule.", icon: Video },
];

const modes = [
  { title: "Google Meet", text: "HD video sessions from anywhere. Encrypted, no recording stored.", icon: Video, badge: "Most popular" },
  { title: "Voice Call", text: "Audio-only support when you need to close your eyes and talk.", icon: Phone, badge: "Low bandwidth" },
  { title: "In-person", text: "Meet at a verified clinic in supported cities.", icon: MapPin, badge: "Select cities" },
];

const stories = [
  ["I was skeptical about online therapy. Three months with Dr. Ananya and I sleep through the night again.", "Aarav S.", "Student, 22"],
  ["Marcus gave us tools we still use every week. We actually talk now.", "Maya and Jon", "Couple, 31"],
  ["Postpartum hit me hard. Dr. Priya was warm, patient, and never made me feel broken.", "Priscilla O.", "New mom"],
];

const faqs = [
  { q: "How quickly can I book a session?", a: "Most counsellors have availability within 24 hours. Simply browse profiles, pick a plan, and choose your preferred time slot." },
  { q: "Is what I share really confidential?", a: "Absolutely. All sessions are encrypted, your identity is protected, and nothing is shared without your explicit consent. Anonymous mode is available." },
  { q: "Can I switch counsellors if it is not the right fit?", a: "Yes, you can switch anytime. We encourage finding the right match — your wellbeing comes first." },
  { q: "Do you accept insurance?", a: "We are building insurance partnerships. Currently, all payments are direct and transparent with no hidden fees." },
  { q: "What if I am in crisis right now?", a: "If you are in immediate distress, please reach out to a 24/7 crisis helpline. MindSupport is for ongoing care, not emergencies." },
];

export const HomeCounsellors = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return featuredCounsellors.filter(c => {
      const text = [c.name, c.role, c.bio, c.location, c.language, ...c.tags].join(" ").toLowerCase();
      const matchesSearch = !q || text.includes(q);
      const matchesCategory = category === "All" || text.includes(category.toLowerCase()) || c.tags.some(t => t.toLowerCase().includes(category.toLowerCase()));
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const visibleCounsellors = useMemo(() => {
    return filtered.slice(0, 4);
  }, [filtered]);

  return (
    <section className="bg-[#0a0e1a] py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-violet-900/5 via-transparent to-cyan-900/5 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-3">
            Our <span className="text-transparent bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text">counsellors</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">Find someone you click with — verified professionals ready to support you.</p>
        </div>

        {/* Search + Filters */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, specialty, or concern..."
              className="h-11 rounded-xl bg-white/5 border border-white/10 pl-11 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {allCategories.slice(0, 12).map(item => (
              <button key={item} onClick={() => setCategory(item)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === item ? "bg-violet-500 text-white shadow-lg shadow-violet-500/25" : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-3">{filtered.length} of {featuredCounsellors.length} counsellors found</p>
        </div>

        {/* Counsellors Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No counsellors match your search. Try different keywords.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleCounsellors.map(c => (
              <div key={c.name} className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-violet-500/30 hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/5">
                <div className="relative h-48 bg-gradient-to-br from-violet-900/40 to-cyan-900/40 overflow-hidden">
                  <img src={c.image || avatarUrl(c.name)} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <h3 className="text-base font-bold text-white drop-shadow-lg">{c.name}</h3>
                    <p className="text-xs text-slate-300 drop-shadow">{c.role}</p>
                  </div>
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-amber-200">{c.rating}</span>
                    <span className="text-slate-500">({c.reviews})</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">{c.exp}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{c.bio}</p>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 3).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded text-[10px] font-medium border border-violet-500/20">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-slate-500">Starts at</p>
                      <p className="text-base font-bold text-white">{c.price}<span className="text-[10px] font-normal text-slate-500 ml-1">/ pkg</span></p>
                    </div>
                    <Button onClick={() => navigate("/counselling")} className="bg-violet-500 hover:bg-violet-400 text-white rounded-xl px-4 h-9 text-xs font-medium shadow-lg shadow-violet-500/25">
                      View Profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View More Button */}
        <div className="text-center mt-10">
          <Button
            onClick={() => navigate("/counselling")}
            className="bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-400 hover:to-cyan-400 text-white rounded-full px-8 py-6 text-sm font-bold shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 group"
          >
            View All Counsellors
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const HomeSupportFlow = () => {
  const navigate = useNavigate();
  return (
    <section className="bg-[#0a0e1a] py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/5 via-transparent to-violet-900/5 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* How it works */}
        <div>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How it <span className="text-transparent bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text">works</span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">From first message to first session in three simple steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-[28px] left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-violet-500/30 -translate-y-1/2 z-0" />

            {steps.map((step, i) => (
              <div key={step.title} className="relative z-10">
                <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.1] rounded-[28px] p-8 text-center hover:border-violet-500/50 hover:from-white/[0.06] hover:to-white/[0.02] transition-all duration-500 hover:-translate-y-2 h-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(139,92,246,0.15)]">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl rotate-6 opacity-50 blur-md group-hover:opacity-70 transition-opacity" />
                    <div className="relative w-16 h-16 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/40">
                      <span className="text-2xl font-bold text-white">0{i + 1}</span>
                    </div>
                  </div>

                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-xl" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-violet-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-violet-400/30">
                      <step.icon className="h-9 w-9 text-violet-300" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.text}</p>

                  <div className="mt-6 h-1 w-12 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full mx-auto opacity-60" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stories */}
        <div>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium mb-4">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              Testimonials
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Real people. <span className="text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-violet-400 bg-clip-text">Real progress.</span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">Hear from people who found the support they needed.</p>
          </div>

          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="grid md:grid-cols-3 gap-6 relative">
              {stories.map(([quote, name, meta], i) => (
                <div key={name} className="relative group bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.1] rounded-[24px] p-7 hover:border-amber-500/40 hover:from-white/[0.06] hover:to-white/[0.02] transition-all duration-500 hover:-translate-y-1">
                  <div className="absolute -top-3 left-6">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" />
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 mb-5">
                    <svg className="h-8 w-8 text-amber-400/30 mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z"/></svg>
                    <p className="text-sm text-slate-300 leading-relaxed italic">{quote}</p>
                  </div>
                  <div className="border-t border-white/[0.06] pt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-sm font-bold text-white shadow-lg shadow-amber-500/20">
                      {name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{name}</p>
                      <p className="text-xs text-slate-500">{meta}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              FAQ
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Got <span className="text-transparent bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text">questions?</span>
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto">Everything you need to know before your first session.</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((f, i) => (
              <details key={f.q} className="group bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-300 hover:border-violet-500/30 open:border-violet-500/30 open:shadow-lg open:shadow-violet-500/5">
                <summary className="cursor-pointer px-6 py-5 text-sm font-medium flex items-center justify-between list-none">
                  <span className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400 text-xs font-bold">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-white/90 group-hover:text-white transition-colors">{f.q}</span>
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-all duration-300 group-open:bg-violet-500/20 group-open:text-violet-400 group-open:rotate-45">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  </span>
                </summary>
                <div className="px-6 pb-5 pt-0">
                  <div className="h-px bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-transparent mb-4" />
                  <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Crisis */}
        <div className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">In crisis? You are not alone.</h3>
              <p className="text-sm text-slate-400">If you or someone you know is in immediate distress, reach out to a 24/7 helpline. Therapy is ongoing care and emergencies need urgent support.</p>
            </div>
            <Button onClick={() => navigate("/resources")} className="bg-red-500 hover:bg-red-400 text-white rounded-xl px-6 h-10 font-medium shrink-0">
              Get crisis help <MessageCircle className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSupportFlow;
import { Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-mental-health.jpg";
import FlowingMenu from "@/components/reactbits/FlowingMenu";

const supportPathItems = [
  { link: "/counselling", text: "Book Counselling", image: heroImage },
  { link: "/resources", text: "Wellness Resources", image: heroImage },
  { link: "/wellness", text: "Track Progress", image: heroImage },
  { link: "/peer", text: "Peer Support", image: heroImage },
];

const HomeFlowingMenu = () => {
  return (
    <section className="bg-[#0a0e1a] py-16 md:py-24 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-violet-500/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-cyan-500/6 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Support paths
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Choose what you <span className="text-transparent bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text">need today</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed">
            Hover a path to preview the experience, then jump straight into counselling, resources, progress, or peer support.
          </p>
        </div>

        {/* Flowing Menu */}
        <div className="premium-hover-card h-[460px] overflow-hidden rounded-[26px] border border-cyan-300/15 bg-[#080d1d] shadow-[0_22px_64px_rgba(34,211,238,0.12)]" data-motion>
          <FlowingMenu
            items={supportPathItems}
            speed={16}
            textColor="#e5efff"
            bgColor="#080d1d"
            marqueeBgColor="#7df9ff"
            marqueeTextColor="#05111f"
            borderColor="rgba(125, 249, 255, 0.18)"
          />
        </div>
      </div>
    </section>
  );
};

export default HomeFlowingMenu;
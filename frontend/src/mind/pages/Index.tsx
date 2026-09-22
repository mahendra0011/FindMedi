import Navigation from "@/mind/components/Navigation";
import Hero from "@/mind/components/Hero";
import WhyMindSupport from "@/mind/components/WhyMindSupport";
import PlatformFeatures from "@/mind/components/PlatformFeatures";
import CounsellingSupport from "@/mind/components/CounsellingSupport";


import TalkSection from "@/mind/components/TalkSection";
import HomeFlowingMenu from "@/mind/components/HomeFlowingMenu";
import HomeSupportFlow, { HomeCounsellors } from "@/mind/components/HomeSupportFlow";
import CallToAction from "@/mind/components/CallToAction";
import Footer from "@/mind/components/Footer";
const Index = () => {
    return (<div className="min-h-screen bg-background text-foreground theme-findmedi">
      <Navigation />
      <Hero />
      <HomeCounsellors />
      <WhyMindSupport />
      <PlatformFeatures />

      <CounsellingSupport />

      <TalkSection />
      <HomeFlowingMenu />
      <HomeSupportFlow />
      <CallToAction />
      <Footer />
    </div>);
};
export default Index;
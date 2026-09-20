import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import WhyMindSupport from "@/components/WhyMindSupport";
import PlatformFeatures from "@/components/PlatformFeatures";
import CounsellingSupport from "@/components/CounsellingSupport";


import TalkSection from "@/components/TalkSection";
import HomeFlowingMenu from "@/components/HomeFlowingMenu";
import HomeSupportFlow, { HomeCounsellors } from "@/components/HomeSupportFlow";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
const Index = () => {
    return (<div className="min-h-screen bg-background">
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
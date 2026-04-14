import AnalyticsCharts from "./landingPage/AnalyticsCharts";
import CTASection from "./landingPage/CTASection";
import FeaturesGrid from "./landingPage/FeaturesGrid";
import HeroSection from "./landingPage/HeroSection";
import HowItWorks from "./landingPage/HowItWorks";
import IntegrationPartners from "./landingPage/IntegrationPartners";
import LiveStats from "./landingPage/LiveStats";
import ParticleBackground from "./landingPage/ParticleBackground";
import ShowcaseGallery from "./landingPage/ShowcaseGallery";
import Testimonials from "./landingPage/Testimonials";
import UseCases from "./landingPage/UseCases";


export default function Home() {
  return (
    <div data-testid="home-page" className="min-h-screen overflow-y-auto relative landing-bg noise-overlay">
      {/* Fixed particle background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-[#ff5b1f]/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[#1fbf9a]/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <ParticleBackground />
      </div>

      {/* All sections */}
      <div className="relative z-10">
        <HeroSection />
        <LiveStats />
        <FeaturesGrid />
        <AnalyticsCharts />
        <HowItWorks />
        <UseCases />
        <ShowcaseGallery />
        <Testimonials />
        <IntegrationPartners />
        <CTASection />
      </div>
    </div>
  );
}

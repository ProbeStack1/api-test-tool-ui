/**
 * Landing Page — 1:1 port of the legacy Home component.
 * Composes all landing sections (Hero, LiveStats, Features, AnalyticsCharts,
 * HowItWorks, UseCases, ShowcaseGallery, Testimonials, IntegrationPartners, CTA)
 * plus the particle background and ambient glow exactly like the old zip.
 */
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/sections/HeroSection';
import LiveStats from '@/components/landing/sections/LiveStats';
import FeaturesGrid from '@/components/landing/sections/FeaturesGrid';
import AnalyticsCharts from '@/components/landing/sections/AnalyticsCharts';
import HowItWorks from '@/components/landing/sections/HowItWorks';
import UseCases from '@/components/landing/sections/UseCases';
import ShowcaseGallery from '@/components/landing/sections/ShowcaseGallery';
import Testimonials from '@/components/landing/sections/Testimonials';
import IntegrationPartners from '@/components/landing/sections/IntegrationPartners';
import CTASection from '@/components/landing/sections/CTASection';
import ParticleBackground from '@/components/landing/sections/ParticleBackground';

export const LandingPage = () => (
  <div
    data-testid="landing-page"
    className="landing-bg noise-overlay relative min-h-screen overflow-y-auto"
  >
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Ambient floating orbs — bigger + brighter than the legacy 8%
       *  alpha which was barely visible on dark backgrounds. Each orb
       *  has its own duration / delay so they never sync up. */}
      <div className="absolute -left-1/4 -top-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#ff5b1f]/25 blur-[120px]" />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#1fbf9a]/22 blur-[120px]"
        style={{ animationDelay: '2s', animationDuration: '8s' }}
      />
      <ParticleBackground />
    </div>

    <LandingNavbar />

    <div className="relative z-10 pt-14">
      <HeroSection />
      <LiveStats />
      <FeaturesGrid />
      <AnalyticsCharts />
      <HowItWorks />
      <UseCases />
      <ShowcaseGallery />
      {/* <Testimonials /> */}
      <IntegrationPartners />
      <CTASection />
    </div>
  </div>
);

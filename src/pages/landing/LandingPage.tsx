/**
 * Landing Page — composes the landing chrome with the new product
 * narrative from `/app/memory/LANDING_PAGE_SPEC.md`:
 *   Hero (copy refreshed, terminal + particles untouched)
 *   → LiveStats   → Pillars (8)   → Analytics   → HowItWorks
 *   → UseCases    → ShowcaseGallery   → IntegrationPartners
 *   → CTASection  → LandingFooter
 *
 * Theme/background untouched per user requirement — only the section
 * roster + nav + copy got refreshed. New sections lazily compose
 * existing primitives so we don't add CSS variables.
 */
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/sections/HeroSection';
import LiveStats from '@/components/landing/sections/LiveStats';
import PillarsSection from '@/components/landing/sections/PillarsSection';
import ProductShowcase from '@/components/landing/sections/ProductShowcase';
import FeaturesGrid from '@/components/landing/sections/FeaturesGrid';
import AnalyticsCharts from '@/components/landing/sections/AnalyticsCharts';
import HowItWorks from '@/components/landing/sections/HowItWorks';
import UseCases from '@/components/landing/sections/UseCases';
import ShowcaseGallery from '@/components/landing/sections/ShowcaseGallery';
import IntegrationPartners from '@/components/landing/sections/IntegrationPartners';
import CTASection from '@/components/landing/sections/CTASection';
import ParticleBackground from '@/components/landing/sections/ParticleBackground';
import LandingFooter from '@/components/landing/sections/LandingFooter';

export const LandingPage = () => (
  <div
    data-testid="landing-page"
    className="landing-bg noise-overlay relative min-h-screen overflow-y-auto"
  >
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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
      <PillarsSection />
      <ProductShowcase />
      <FeaturesGrid />
      <AnalyticsCharts />
      <HowItWorks />
      <UseCases />
      <ShowcaseGallery />
      <IntegrationPartners />
      <CTASection />
      <LandingFooter />
    </div>
  </div>
);

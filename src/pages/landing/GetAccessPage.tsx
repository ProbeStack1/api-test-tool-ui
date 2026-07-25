import React, { useState } from 'react';
import '@/styles/landing.css';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import ParticleBackground from '@/components/landing/sections/ParticleBackground';
import LandingFooter from '@/components/landing/sections/LandingFooter';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users2,
  Lock
} from 'lucide-react';

export const GetAccessPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.company) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Simulate successful request
    setIsSubmitted(true);
    toast.success('Access Request Submitted!');
  };

  return (
    <div
      data-testid="get-access-page"
      className="landing-bg noise-overlay relative min-h-screen overflow-y-auto"
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#ff5b1f]/15 blur-[120px]" />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[55%] w-[55%] animate-float rounded-full bg-[#1fbf9a]/15 blur-[120px]"
          style={{ animationDelay: '2s', animationDuration: '8s' }}
        />
        <ParticleBackground />
      </div>

      <LandingNavbar />

      <main className="relative z-10 pt-24 pb-24 w-full px-6 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Side: Value Propositions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium border border-primary/20">
              <Sparkles className="w-3.5 h-3.5" /> Request Access
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-text-primary font-display leading-tight">
              Secure early access to ForgeFuzz Advanced Scanners
            </h1>
            <p className="text-text-secondary leading-relaxed text-sm md:text-base">
              Join teams from top developer organizations who run high-fidelity vulnerability, API compliance, and multi-region testing sequences.
            </p>

            <div className="space-y-4 pt-4">
              <div className="flex gap-3 items-start">
                <div className="p-1 rounded bg-[#1fbf9a]/10 border border-[#1fbf9a]/20 text-[#1fbf9a] shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">OWASP Compliant Assertions</h4>
                  <p className="text-[14px] text-text-muted leading-relaxed">Fully automated test cases built from your specification schemas.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-1 rounded bg-primary/10 border border-primary/20 text-primary shrink-0 mt-0.5">
                  <Users2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">Shared Team Projects</h4>
                  <p className="text-[14px] text-text-muted leading-relaxed">Sync tokens and collections with granular read/write roles.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">Granular Security Checks</h4>
                  <p className="text-[14px] text-text-muted leading-relaxed">Continuous compliance filters enforced before release tags.</p>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className=" ml-10">
              <h3 className="text-sm font-bold text-text-primary font-display uppercase tracking-wider mb-3">
                Contact Details
              </h3>
              <div className="space-y-2 text-[14px] text-text-secondary">
                <p><span className="font-semibold text-text-primary">Email:</span> support@forgefuzz.com</p>
                <p><span className="font-semibold text-text-primary">Phone:</span> +1 (555) 123-4567</p>
                <p><span className="font-semibold text-text-primary">Address:</span> 123 Security Blvd, Suite 200, SF, CA</p>
              </div>
              <p className="text-[14px] text-text-muted mt-3">
                For any queries, feel free to <a href="mailto:support@forgefuzz.com" className="text-primary hover:underline">email us</a>.
              </p>
            </div>
          </div>

          {/* Right Side: Contact Request Form */}
          <div className="lg:col-span-7 bg-surface/90 border border-border rounded-2xl mt-16 p-6 md:p-10 shadow-2xl relative">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-xl font-bold text-text-primary font-display mb-1">
                  Submit Access Request
                </h3>
                <p className="text-text-secondary text-[14px]">
                  Provide your work details, and our dev leads will coordinate your staging access.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-text-secondary tracking-wider">FULL NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-10 px-3 bg-surface border border-border rounded text-[14px] text-text-primary focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-text-secondary tracking-wider">BUSINESS EMAIL *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-10 px-3 bg-surface border border-border rounded text-[14px] text-text-primary focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-text-secondary tracking-wider">COMPANY *</label>
                    <input
                      type="text"
                      required
                      placeholder="Acme Corp"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full h-10 px-3 bg-surface border border-border rounded text-[14px] text-text-primary focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-text-secondary tracking-wider">ROLE</label>
                    <input
                      type="text"
                      placeholder="Lead Dev / QA Engineer"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full h-10 px-3 bg-surface border border-border rounded text-[14px] text-text-primary focus:border-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-text-secondary tracking-wider">MESSAGE / TESTING REQUIREMENTS</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your active workflows, schema sizes, and concurrency goals..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full p-3 bg-surface border border-border rounded text-[14px] text-text-primary focus:border-primary outline-none transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 rounded bg-primary text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
                >
                  Request Early Access <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-success mx-auto animate-bounce" />
                <h3 className="text-2xl font-bold text-text-primary font-display">
                  Thank You, {formData.name}!
                </h3>
                <p className="text-text-secondary text-sm max-w-md mx-auto">
                  Your access request has been sent to our pipeline review team. We will contact you at <strong className="text-primary">{formData.email}</strong> with your project activation keys.
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-surface border border-border rounded text-[14px] text-text-primary hover:text-primary transition-colors"
                >
                  Return to Home Page
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

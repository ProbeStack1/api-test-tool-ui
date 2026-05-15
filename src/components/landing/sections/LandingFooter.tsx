/**
 * LandingFooter — final footer aligned with LANDING_PAGE_SPEC.md §10:
 * Product · Solutions · Pricing · Docs · Changelog · Status · Security · Contact.
 * Pure markup, no new colours — uses existing `bg-surface` / `text-text-*`
 * tokens so it inherits the theme automatically.
 */
import { Link } from 'react-router-dom';
import { Logo } from '@/components/common/Logo';

const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Workspaces',       href: '/#pillars' },
      { label: 'Mock Server',      href: '/#pillars' },
      { label: 'Functional Tests', href: '/#pillars' },
      { label: 'Load Tests',       href: '/#pillars' },
      { label: 'Security Scan',    href: '/#pillars' },
      { label: 'Bug Tracker',      href: '/#pillars' },
      { label: 'Monitors',         href: '/#pillars' },
      { label: 'MCP Studio',       href: '/#pillars' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'QA Engineers',         href: '/solutions#qa' },
      { label: 'Backend Developers',   href: '/solutions#dev' },
      { label: 'DevOps / SRE',         href: '/solutions#devops' },
      { label: 'Security Teams',       href: '/solutions#sec' },
      { label: 'API Product Managers', href: '/solutions#pm' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Pricing',    href: '/pricing' },
      { label: 'Docs',       href: '/api-hub' },
      { label: 'API Hub',    href: '/api-hub' },
      { label: 'Changelog',  href: '/changelog' },
      { label: 'Status',     href: '/status/forgeq' },
      { label: 'Security',   href: '/#security' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',      href: '/#about' },
      { label: 'Contact',    href: 'mailto:hello@probestack.io', external: true },
      { label: 'GitHub',     href: 'https://github.com/ForgeCrux', external: true },
      { label: 'Twitter',    href: 'https://twitter.com/probestack', external: true },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer
      data-testid="landing-footer"
      className="relative z-10 border-t border-border bg-surface/40 backdrop-blur-sm"
    >
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand block */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-1 mb-3">
              <Logo variant="mark" className="h-10 w-8" />
              <div className="text-left">
                <div className="text-[0.7rem] text-text-secondary tracking-normal leading-tight">
                  probestack
                </div>
                <div className="font-bold text-xl leading-tight gradient-text">ForgeFuzz</div>
              </div>
            </Link>
            <p className="text-xs text-text-secondary leading-relaxed">
              The API lifecycle platform that ships with its own QA team — spec to incident, one workspace.
            </p>
            <p className="mt-3 text-[10px] font-mono text-text-muted">
              SOC2-ready · GDPR · audit log retention
            </p>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] uppercase tracking-wider font-semibold text-text-primary mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                        data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-text-muted">
            © {new Date().getFullYear()} ProbeStack · ForgeFuzz. All rights reserved.
          </p>
          <p className="text-[10px] font-mono text-text-muted">
            {/* 16 microservices · MongoDB Atlas · Gemini-powered AI */}
          </p>
        </div>
      </div>
    </footer>
  );
}

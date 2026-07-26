import React from "react";
import { Link } from "react-router-dom";
import { Twitter, Github, Linkedin, Mail } from "lucide-react";

type FooterLink = {
  name: string;
  path: string;
};

type FooterLinks = Record<string, FooterLink[]>;

type SocialLink = {
  icon: React.ElementType;
  href: string;
  label: string;
};

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

const footerLinks: FooterLinks = {
  Product: [
    { name: "Features", path: "/features" },
    { name: "How It Works", path: "/how-it-works" },
    { name: "Pricing", path: "/pricing" },
    { name: "Marketplace", path: "/api-hub" },
  ],
  Capabilities: [
    { name: "Collection & Request Builder", path: "/capabilities/request-builder" },
    { name: "Load & Functional Testing", path: "/capabilities/load-functional-testing" },
    { name: "Agentic AI & LLM Testing", path: "/capabilities/ai-llm-testing" },
    { name: "Mock Server", path: "/capabilities/mock-sandbox" },
  ],
  Resources: [
    { name: "Documentation", path: "https://probestack.io/documentation" },
    { name: "Release Notes", path: "https://probestack.io/release-notes" },
    { name: "Community", path: "https://community.probestack.io" },
    { name: "Support", path: "https://support.probestack.io" },
  ],
  Company: [
    { name: "About Us", path: "https://probestack.io/about-us" },
    { name: "Careers", path: "https://probestack.io/careers" },
    { name: "Blog", path: "/blog" },
    { name: "Contact", path: "/contact" },
  ],
  Legal: [
    { name: "Privacy Policy", path: "https://probestack.io/privacy-policy" },
    { name: "Terms of Service", path: "https://probestack.io/terms-of-service" },
  ],
};

  const socialLinks: SocialLink[] = [
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Github, href: "#", label: "GitHub" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@probestack.com", label: "Email" },
  ];

  return (
    <footer className="gradient-bg relative bg-background-light border-t border-border footer-main">
      <div className="mx-auto max-w-8xl px-6 py-12 sm:px-6 lg:px-20">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-7">
          <div className="col-span-2">
            <Link to="/" className="mb-4 flex items-center space-x-3 group">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-10 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-2xl font-extrabold gradient-text">ProbeStack</span>
                <span className="text-[10px] text-[#f2c24d] leading-tight">Probing Deeper, Stacking Precision</span>
              </div>
            </Link>
            <p className="mb-6 max-w-xs text-md text-muted-foreground">
              The API Testing platform that ships with its own QA team — spec to incident, one workspace.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="group rounded-lg bg-elevated p-4 transition-colors hover:text-primary"
                >
                  <social.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="mb-4 font-heading font-semibold text-foreground">
                {category}
              </h3>
              <ul className="space-y-3">
{links.map((link) => (
  <li key={link.name}>
    {link.path.startsWith('http') ? (
      <a
        href={link.path}
        target="_blank"         
        rel="noopener noreferrer"
        className="text-md text-text-muted transition-colors hover:text-primary"
      >
        {link.name}
      </a>
    ) : (
      <Link
        to={link.path}
        className="text-md text-text-muted transition-colors hover:text-primary"
      >
        {link.name}
      </Link>
    )}
  </li>
))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 text-md text-muted-foreground md:flex-row md:space-y-0">
            <p>© {currentYear} ProbeStack. All rights reserved.</p>
            <p>Built with ❤️ for developers worldwide</p>
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden py-12">
        <div className="mx-auto max-w-6xl px-4">
          <a href="https://probestack.io/" target="_blank" rel="noopener noreferrer" aria-label="Visit ProbeStack">
            <svg
              viewBox="0 0 1200 180"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full cursor-pointer"
              aria-label="PROBESTACK"
            >
              <defs>
                <linearGradient id="footer-probestack-outline" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff5b1f" />
                  <stop offset="40%" stopColor="#ffb400" />
                  <stop offset="100%" stopColor="#1fbf9a" />
                </linearGradient>
              </defs>
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                fill="none"
                fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontSize="136"
                fontWeight="700"
                lengthAdjust="spacingAndGlyphs"
                letterSpacing="0.25em"
                stroke="url(#footer-probestack-outline)"
                strokeOpacity="0.82"
                strokeWidth="3.25"
                textAnchor="middle"
                textLength="1120"
              >
                PROBESTACK
              </text>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
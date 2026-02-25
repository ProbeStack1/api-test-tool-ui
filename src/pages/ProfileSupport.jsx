import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Search,
  BookOpen,
  MessageCircle,
  Activity,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

const popularLinks = [
  { label: "API Setup", path: "/documentation" },
  { label: "Billing", path: "/contact" },
  { label: "Data Sync", path: "/documentation" },
  { label: "Integrations", path: "/integrations" },
];

const supportCards = [
  {
    title: "Browse Knowledge Base",
    description:
      "Explore detailed technical guides, release notes, and product documentation.",
    icon: BookOpen,
    cta: "Learn more",
    path: "/workspace/knowledgebase",
  },
  {
    title: "Community Forum",
    description:
      "Join the conversation, ask questions, and share insights with other users.",
    icon: MessageCircle,
    cta: "Join discussions",
    path: "/community",
  },
  {
    title: "System Status",
    description:
      "All systems are currently operational. Check real-time uptime statistics.",
    icon: Activity,
    cta: "Check status",
    path: "#",
    live: true,
  },
];

export const ProfileSupport = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/workspace/knowledgebase?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-probestack-bg flex flex-col overflow-y-auto">
      <main className="flex-grow">
        {/* Hero Search Section */}
        <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none -z-10 opacity-30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/30 blur-[120px] rounded-full" />
          </div>
          <div className="max-w-4xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight"
            >
              <span className="bg-gradient-to-r from-primary via-amber-500 to-teal-500 bg-clip-text text-transparent">How can we help you?</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-gray-400 mb-10"
            >
              Find solutions, read technical guides, or connect with our support
              team.
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              onSubmit={handleSearch}
              className="relative group"
            >
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help, tutorials, or documentation..."
                className="w-full pl-14 pr-24 py-5 bg-dark-800/50 border border-dark-700 rounded-xl text-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-lg"
              />
              <div className="absolute right-2 inset-y-0 flex items-center">
                <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-400 bg-dark-700 border border-dark-600 rounded shadow-sm">
                  CMD + K
                </kbd>
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 flex flex-wrap justify-center gap-3 items-center"
            >
              <span className="text-sm text-gray-400">Popular:</span>
              {popularLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Feature Card Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {supportCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <Link
                    to={card.path}
                    className="group block p-8 bg-dark-800/50 border border-dark-700 rounded-xl hover:border-primary/50 transition-all cursor-pointer shadow-sm hover:shadow-lg"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      {card.live && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          Live
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-white">
                      {card.title}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {card.description}
                    </p>
                    <div className="flex items-center text-primary font-semibold text-sm">
                      {card.cta}
                      <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-dark-800/30 py-16 border-t border-dark-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-white">
                Can&apos;t find what you&apos;re looking for?
              </h2>
              <p className="text-gray-400">
                Our support engineers are available to assist you.
              </p>
            </div>
            <div className="flex gap-4 flex-shrink-0">
              <Button
                variant="outline"
                className="border-dark-700 hover:bg-dark-700"
                asChild
              >
                <Link to="/workspace/knowledgebase">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  View FAQs
                </Link>
              </Button>
              <Button variant="default" asChild>
                <Link to="/workspace/profile/support/ticket">
                  Raise Support Ticket
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/50 shrink-0 bg-dark-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
            <div className="flex items-center gap-2">
              <img
                src="/assets/justlogo.png"
                alt="ProbeStack logo"
                className="h-6 w-auto"
                onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }}
              />
              <span className="font-semibold gradient-text font-heading">ProbeStack</span>
              <span className="text-gray-400">
                © {new Date().getFullYear()} All rights reserved
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Terms of Service
              </a>
              <a href="/security" className="hover:text-[#ff5b1f] transition-colors text-gray-400">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

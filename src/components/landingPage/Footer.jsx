export default function Footer() {
  return (
    <footer className="border-t mt-8 z-999 -mb-8 border-dark-700/50 shrink-0 bg-dark-800/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-gray-400 md:flex-row">
          <div className="flex items-center gap-2">
            <img
              src="/assets/justlogo.png"
              alt="ProbeStack logo"
              className="h-6 w-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
            <span className="font-semibold gradient-text font-heading">ProbeStack</span>
            <span className="text-gray-400">
              © {new Date().getFullYear()} All rights reserved
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/privacy-policy"
              className="hover:text-[#ff5b1f] transition-colors text-gray-400"
            >
              Privacy Policy
            </a>
            <a
              href="/terms-of-service"
              className="hover:text-[#ff5b1f] transition-colors text-gray-400"
            >
              Terms of Service
            </a>
            <a
              href="/security"
              className="hover:text-[#ff5b1f] transition-colors text-gray-400"
            >
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
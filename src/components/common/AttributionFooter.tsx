/**
 * AttributionFooter — single small credit line for third-party assets used
 * across the app. Rendered ONCE inside the global StatusBar so the user
 * sees it everywhere without per-page noise.
 */
export const AttributionFooter = () => (
  <span data-testid="attribution-footer" className="hidden text-[9px] text-text-muted/60 lg:inline">
    {/* Icons by{' '}
    <a
      href="https://lordicon.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-text-muted hover:underline"
    >
      Lordicon
    </a>
    {' · '}
    <a
      href="https://lucide.dev/"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-text-muted hover:underline"
    >
      Lucide
    </a> */}
  </span>
);

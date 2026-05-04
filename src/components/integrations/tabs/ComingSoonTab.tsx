import { Sparkles } from 'lucide-react';

export const ComingSoonTab = ({ title, hint }: { title: string; hint: string }) => (
  <div className="flex h-full items-center justify-center p-12 text-center" data-testid={`mcp-coming-soon-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="max-w-md">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-xs text-text-muted">{hint}</p>
      <p className="mt-3 text-[10px] italic text-text-muted">
        Wired to the Java microservice — surfacing in the next iteration.
      </p>
    </div>
  </div>
);

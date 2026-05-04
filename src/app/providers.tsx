/**
 * Global providers.
 * What : QueryClient, Toaster (sonner), Tooltip.Provider, ErrorBoundary.
 * Why  : Centralizes cross-cutting concerns; added here never in features.
 */
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { ErrorBoundary } from './error-boundary';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { PromptProvider } from '@/components/ui/PromptDialog';
import type { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached responses are considered fresh for 60s — switching tabs/pages
      // within that window reuses the cache instantly instead of refetching.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Keep showing the last successful data while a new fetch runs in the
      // background — feels instant, no skeleton flicker on key changes.
      placeholderData: keepPreviousData,
      retry: 1,
    },
  },
});

export const Providers = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ConfirmProvider>
          <PromptProvider>
            {children}
            <Toaster
              theme="dark"
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                },
              }}
            />
          </PromptProvider>
        </ConfirmProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

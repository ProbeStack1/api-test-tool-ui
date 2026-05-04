/**
 * ThemeToggle — header button to flip between dark and light themes.
 * Reactively reads settings.store; icon swaps with a subtle rotation.
 */
import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/stores/settings.store';
import { Button } from '@/components/ui/Button';

export const ThemeToggle = () => {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      data-testid="theme-toggle"
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Moon className="h-4 w-4 transition-transform duration-300" />
      ) : (
        <Sun className="h-4 w-4 transition-transform duration-300" />
      )}
    </Button>
  );
};

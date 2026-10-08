import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, preference, setTheme } = useTheme();
  const next = preference === 'light' ? 'dark' : preference === 'dark' ? 'system' : 'light';
  const Icon = theme === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${preference}. Switch to ${next}.`}
      title={`Theme: ${preference} (switch to ${next})`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="hidden capitalize sm:inline">{preference}</span>
      {preference === 'system' && <Monitor className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />}
    </button>
  );
}

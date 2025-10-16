import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useSystemTheme } from './SystemThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useSystemTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--secondary)] text-[var(--foreground)] transition-colors duration-200"
      aria-label={`Switch to ${theme.isDark ? 'light' : 'dark'} mode`}
    >
      {theme.isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

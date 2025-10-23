import React, { createContext, useContext, useEffect, useState } from 'react';

interface SystemTheme {
  isDark: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

interface SystemThemeContextType {
  theme: SystemTheme;
  toggleTheme: () => void;
}

const SystemThemeContext = createContext<SystemThemeContextType | undefined>(undefined);

// Default light theme
const lightTheme: SystemTheme = {
  isDark: false,
  primaryColor: '#97CF50',
  secondaryColor: '#09215F',
  accentColor: '#2D5654',
  backgroundColor: '#FFFFFF',
  textColor: '#09215F',
  borderColor: '#E5E7EB'
};

// Dark theme
const darkTheme: SystemTheme = {
  isDark: true,
  primaryColor: '#97CF50',
  secondaryColor: '#09215F',
  accentColor: '#2D5654',
  backgroundColor: '#111827',
  textColor: '#F9FAFB',
  borderColor: '#374151'
};

export function SystemThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SystemTheme>(lightTheme);

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('best-brightness-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTheme(darkTheme);
    } else {
      setTheme(lightTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--secondary', theme.accentColor);
    root.style.setProperty('--secondary-foreground', theme.textColor);
    root.style.setProperty('--accent', theme.accentColor);
    root.style.setProperty('--accent-foreground', theme.textColor);
    root.style.setProperty('--background', theme.backgroundColor);
    root.style.setProperty('--foreground', theme.textColor);
    root.style.setProperty('--card', theme.backgroundColor);
    root.style.setProperty('--card-foreground', theme.textColor);
    root.style.setProperty('--popover', theme.backgroundColor);
    root.style.setProperty('--popover-foreground', theme.textColor);
    root.style.setProperty('--muted', '#F8F9FA');
    root.style.setProperty('--muted-foreground', '#6C757D');
    root.style.setProperty('--border', `rgba(9, 33, 95, 0.1)`);
    root.style.setProperty('--input', 'transparent');
    root.style.setProperty('--ring', theme.accentColor);
    root.style.setProperty('--chart-1', theme.primaryColor);
    root.style.setProperty('--chart-2', theme.accentColor);
    
    // Update body class for dark mode
    if (theme.isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme.isDark ? lightTheme : darkTheme;
    setTheme(newTheme);
    localStorage.setItem('best-brightness-theme', newTheme.isDark ? 'dark' : 'light');
  };

  return (
    <SystemThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </SystemThemeContext.Provider>
  );
}

export function useSystemTheme() {
  const context = useContext(SystemThemeContext);
  if (context === undefined) {
    throw new Error('useSystemTheme must be used within a SystemThemeProvider');
  }
  return context;
}

// CSS Variables for consistent theming
export const systemThemeStyles = `
  :root {
    --primary: #97CF50;
    --primary-foreground: #ffffff;
    --secondary: #2D5654;
    --secondary-foreground: #09215F;
    --accent: #2D5654;
    --accent-foreground: #09215F;
    --background: #FFFFFF;
    --foreground: #09215F;
    --card: #ffffff;
    --card-foreground: #09215F;
    --popover: #ffffff;
    --popover-foreground: #09215F;
    --muted: #F8F9FA;
    --muted-foreground: #6C757D;
    --border: rgba(9, 33, 95, 0.1);
    --input: transparent;
    --ring: #2D5654;
    --chart-1: #97CF50;
    --chart-2: #2D5654;
  }

  .dark {
    --primary: #97CF50;
    --primary-foreground: #09215F;
    --secondary: #2D5654;
    --secondary-foreground: #ffffff;
    --accent: #2D5654;
    --accent-foreground: #ffffff;
    --background: #09215F;
    --foreground: #ffffff;
    --card: #09215F;
    --card-foreground: #ffffff;
    --popover: #09215F;
    --popover-foreground: #ffffff;
    --muted: #2D5654;
    --muted-foreground: #97CF50;
    --border: rgba(45, 86, 84, 0.2);
    --input: #2D5654;
    --ring: #2D5654;
    --chart-1: #97CF50;
    --chart-2: #2D5654;
  }

  .theme-primary {
    color: var(--primary);
  }

  .theme-secondary {
    color: var(--secondary);
  }

  .theme-accent {
    color: var(--accent);
  }

  .theme-bg {
    background-color: var(--background);
  }

  .theme-text {
    color: var(--foreground);
  }

  .theme-border {
    border-color: var(--border);
  }
`;

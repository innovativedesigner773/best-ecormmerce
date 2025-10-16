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
  primaryColor: '#4682B4',
  secondaryColor: '#2C3E50',
  accentColor: '#87CEEB',
  backgroundColor: '#FFFFFF',
  textColor: '#2C3E50',
  borderColor: '#E5E7EB'
};

// Dark theme
const darkTheme: SystemTheme = {
  isDark: true,
  primaryColor: '#60A5FA',
  secondaryColor: '#1F2937',
  accentColor: '#3B82F6',
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
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--border-color', theme.borderColor);
    
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
    --primary-color: #4682B4;
    --secondary-color: #2C3E50;
    --accent-color: #87CEEB;
    --background-color: #FFFFFF;
    --text-color: #2C3E50;
    --border-color: #E5E7EB;
  }

  .dark {
    --primary-color: #60A5FA;
    --secondary-color: #1F2937;
    --accent-color: #3B82F6;
    --background-color: #111827;
    --text-color: #F9FAFB;
    --border-color: #374151;
  }

  .theme-primary {
    color: var(--primary-color);
  }

  .theme-secondary {
    color: var(--secondary-color);
  }

  .theme-accent {
    color: var(--accent-color);
  }

  .theme-bg {
    background-color: var(--background-color);
  }

  .theme-text {
    color: var(--text-color);
  }

  .theme-border {
    border-color: var(--border-color);
  }
`;

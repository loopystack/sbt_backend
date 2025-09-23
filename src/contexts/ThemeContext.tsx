
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {}
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Also set the dark class for Tailwind's dark mode
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    if (theme === 'light') {
      root.style.setProperty('--bg', '0 0% 98%');
      root.style.setProperty('--surface', '0 0% 96%');
      root.style.setProperty('--border', '0 0% 85%');
      root.style.setProperty('--text', '0 0% 15%');
      root.style.setProperty('--muted', '0 0% 45%');
    } else {
      root.style.setProperty('--bg', '220 15% 5%');
      root.style.setProperty('--surface', '220 15% 10%');
      root.style.setProperty('--border', '220 15% 20%');
      root.style.setProperty('--text', '0 0% 96%');
      root.style.setProperty('--muted', '0 0% 70%');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

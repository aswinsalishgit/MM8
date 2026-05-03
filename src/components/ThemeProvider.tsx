"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'DARK' | 'LIGHT';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('DARK');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('mm8-theme') as Theme | null;
    if (savedTheme === 'LIGHT') {
      setTheme('LIGHT');
      document.documentElement.classList.add('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === 'DARK' ? 'LIGHT' : 'DARK';
      localStorage.setItem('mm8-theme', newTheme);
      
      if (newTheme === 'LIGHT') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }
      
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

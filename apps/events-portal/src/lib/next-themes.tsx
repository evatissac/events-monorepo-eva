import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setThemeState(isDark ? 'dark' : 'light');
  }, []);

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    const root = document.documentElement;
    root.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('events-portal-theme', newTheme);
  };

  return { theme, setTheme };
}

export default { useTheme };

'use client';

import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

// 主题类型
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// 本地存储键名
const THEME_STORAGE_KEY = 'mozi-theme';
export const APP_THEME_STORAGE_KEY = 'app_theme';
export const APP_THEME_CHANGE_EVENT = 'app-theme-change';

export const resolveColorScheme = (appThemeId) =>
  appThemeId === 'black' ? THEMES.DARK : THEMES.LIGHT;

export const applyAppTheme = (themeId) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  } catch (_) {}
  window.dispatchEvent(new CustomEvent(APP_THEME_CHANGE_EVENT, { detail: { themeId } }));
};

// 创建主题上下文
const ThemeContext = createContext({
  theme: THEMES.LIGHT,
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
});

// 亮色主题变量
const lightThemeVars = {
  '--background': '#f5f5f5',
  '--foreground': '#171717',
  '--border-color': '#eee',
  '--card-bg': '#ffffff',
  '--text-primary': '#1a1a1a',
  '--text-secondary': '#666666',
  '--text-tertiary': '#999999',
};

// 暗色主题变量
const darkThemeVars = {
  '--background': '#0a0a0a',
  '--foreground': '#ededed',
  '--border-color': '#303030',
  '--card-bg': '#1a1a1a',
  '--text-primary': '#ffffff',
  '--text-secondary': '#b3b3b3',
  '--text-tertiary': '#808080',
};

const readStoredTheme = () => {
  if (typeof window === 'undefined') return THEMES.LIGHT;
  try {
    const savedAppTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (savedAppTheme) return resolveColorScheme(savedAppTheme);
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && Object.values(THEMES).includes(savedTheme)) return savedTheme;
  } catch (_) {}
  return THEMES.LIGHT;
};

// 主题提供者组件
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(THEMES.LIGHT);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    setThemeState(readStoredTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const onAppThemeChange = (event) => {
      const nextTheme = resolveColorScheme(event?.detail?.themeId);
      setThemeState(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (_) {}
    };

    window.addEventListener(APP_THEME_CHANGE_EVENT, onAppThemeChange);
    return () => window.removeEventListener(APP_THEME_CHANGE_EVENT, onAppThemeChange);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {}
  }, [mounted, theme]);

  // 应用主题变量到 document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const themeVars = theme === THEMES.DARK ? darkThemeVars : lightThemeVars;

    // 设置 CSS 变量
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 设置 data-theme 属性
    root.setAttribute('data-theme', theme);

    // 设置 color-scheme
    root.style.colorScheme = theme;

    // 设置 body 背景色
    document.body.style.backgroundColor = themeVars['--background'];
    document.body.style.color = themeVars['--foreground'];
  }, [theme, mounted]);

  // 设置主题并保存到 localStorage
  const setTheme = (newTheme) => {
    if (Object.values(THEMES).includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };

  // 切换主题
  const toggleTheme = () => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
  };

  // 判断是否是暗色主题
  const isDark = theme === THEMES.DARK;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 自定义 Hook 用于获取主题
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;

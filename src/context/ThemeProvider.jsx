'use client';

import { createContext, useContext, useState, useEffect } from 'react';

// 主题类型
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};

// 本地存储键名
const THEME_STORAGE_KEY = 'mozi-theme';

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

// 主题提供者组件
export function ThemeProvider({ children }) {
  // 默认使用亮色主题
  const [theme, setThemeState] = useState(THEMES.LIGHT);
  const [mounted, setMounted] = useState(false);

  // 初始化时从 localStorage 读取主题（目前强制亮色）
  useEffect(() => {
    // 强制亮色模式 - 暂时禁用主题读取
    // const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    // if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
    //   setThemeState(savedTheme);
    // }
    setThemeState(THEMES.LIGHT); // 强制亮色
    localStorage.setItem(THEME_STORAGE_KEY, THEMES.LIGHT);
    setMounted(true);
  }, []);

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

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  shadow: string;
  overlay: string;
  success: string;
  warning: string;
  error: string;
}

interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

const lightTheme: Theme = {
  isDark: false,
  colors: {
    primary: '#3A8DFF',
    secondary: '#1A3F78',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    accent: '#FF8F00',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
  },
};

const darkTheme: Theme = {
  isDark: true,
  colors: {
    primary: '#3A8DFF', // גוון כחול בהיר שיתאים לרקע כהה
    secondary: '#1A3F78', // כחול כהה לניגודיות
    background: '#121C2B', // כחול-שחור עמוק כרקע כללי
    surface: '#1A283B', // כחול כהה יותר עבור רכיבים כמו כרטיסים
    text: '#E0E0E0', // טקסט בהיר
    textSecondary: '#A0AEC0', // טקסט אפור בהיר
    border: '#2A3C52', // גבול כחול-אפור כהה
    accent: '#3A8DFF', // הדגשה בכחול בהיר
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',
  },
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
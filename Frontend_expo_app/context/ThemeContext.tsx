import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightTheme, darkTheme } from "../constants/theme";

export type ThemeType = "light" | "dark";

interface ThemeContextType {
  themeType: ThemeType;
  theme: typeof lightTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = "rots-theme";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>("light");

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === "light" || saved === "dark") {
          setThemeType(saved);
        } else if (systemColorScheme === "dark") {
          setThemeType("dark");
        }
      } catch (e) {}
    };
    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = themeType === "light" ? "dark" : "light";
    setThemeType(newTheme);
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme);
    } catch (e) {}
  };

  const theme = themeType === "light" ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ themeType, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

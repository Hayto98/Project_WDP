import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { IconMoon, IconSun } from './icons';

export function ThemeToggle() {
  const { themeType, theme, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.surface2, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }
      ]}
      onPress={toggleTheme}
      accessibilityLabel={themeType === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
    >
      {themeType === 'light' ? (
        <IconMoon color={theme.ink} size={20} />
      ) : (
        <IconSun color={theme.ink} size={20} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

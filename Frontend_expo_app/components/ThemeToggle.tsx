import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { IconMoon, IconSun } from './icons';

export function ThemeToggle() {
  const { themeType, theme, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.surface2, borderColor: theme.border }]}
      onPress={toggleTheme}
      accessibilityLabel={themeType === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
    >
      {themeType === 'light' ? (
        <IconMoon color={theme.ink} size={18} />
      ) : (
        <IconSun color={theme.ink} size={18} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

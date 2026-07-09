import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export interface TextProps extends RNTextProps {
  variant?: 'xs' | 'sm' | 'body' | 'lead' | 'title' | 'heading' | 'display';
  color?: 'ink' | 'inkMuted' | 'inkFaint' | 'primary' | 'success' | 'warning' | 'danger';
  weight?: 'normal' | 'bold';
}

export function Text({ variant = 'body', color = 'ink', weight = 'normal', style, ...props }: TextProps) {
  const { theme } = useTheme();

  const getFontSize = () => {
    switch (variant) {
      case 'xs': return 12;
      case 'sm': return 14;
      case 'body': return 16;
      case 'lead': return 18;
      case 'title': return 22;
      case 'heading': return 28;
      case 'display': return 48;
      default: return 16;
    }
  };

  const getLineHeight = () => {
    switch (variant) {
      case 'xs':
      case 'sm':
      case 'body': return getFontSize() * 1.6;
      case 'lead':
      case 'title':
      case 'heading':
      case 'display': return getFontSize() * 1.2;
      default: return 16 * 1.6;
    }
  };

  return (
    <RNText
      style={[
        {
          fontSize: getFontSize(),
          lineHeight: getLineHeight(),
          color: theme[color],
          fontWeight: weight === 'bold' ? '700' : '400',
        },
        style,
      ]}
      {...props}
    />
  );
}

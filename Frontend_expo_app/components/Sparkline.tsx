import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Polygon } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Props {
  values: number[];
  token: string;
}

export function Sparkline({ values, token }: Props) {
  const { theme } = useTheme();
  
  if (values.length < 2) return <View style={styles.container} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Resolve color based on token
  let colorStr = theme.primary;
  if (token === '--c1') colorStr = theme.primary;
  if (token === '--c2') colorStr = '#8a2be2';
  if (token === '--c3') colorStr = theme.warning;
  if (token === '--c4') colorStr = '#ff1493';
  if (token === '--c5') colorStr = theme.success;
  if (token === '--c6') colorStr = '#ffa500';

  const w = 100;
  const h = 24;
  const dx = w / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * dx;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={w} height={h}>
        <Polygon
          points={`${w},${h} 0,${h} ${points}`}
          fill={colorStr}
          fillOpacity={0.15}
        />
        <Polyline
          points={points}
          fill="none"
          stroke={colorStr}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

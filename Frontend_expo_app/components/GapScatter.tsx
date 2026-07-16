import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Props {
  items: any[];
  densityThreshold: number;
  interestThreshold?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function GapScatter({
  items,
  densityThreshold,
  interestThreshold = 0.55,
  selectedId,
  onSelect,
}: Props) {
  const { theme } = useTheme();

  const resolveColor = (token: string) => {
    if (token === '--c1') return theme.primary;
    if (token === '--c2') return '#8a2be2';
    if (token === '--c3') return theme.warning;
    if (token === '--c4') return '#ff1493';
    if (token === '--c5') return theme.success;
    if (token === '--c6') return '#ffa500';
    return theme.primary;
  };

  const VB = { w: 340, h: 260 };
  const M = { l: 40, r: 16, t: 16, b: 36 };
  const PW = VB.w - M.l - M.r;
  const PH = VB.h - M.t - M.b;

  const x = (d: number) => M.l + d * PW;
  const y = (i: number) => M.t + (1 - i) * PH;

  const gapX = x(densityThreshold);
  const gapY = y(interestThreshold);

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB.w} ${VB.h}`}>
        <Rect
          x={M.l}
          y={M.t}
          width={Math.max(0, gapX - M.l)}
          height={Math.max(0, gapY - M.t)}
          fill={theme.primary}
          fillOpacity={0.08}
        />
        <SvgText x={M.l + 6} y={M.t + 16} fontSize="10" fill={theme.inkMuted}>
          Vùng khoảng trống
        </SvgText>

        <Line x1={M.l} y1={M.t} x2={M.l} y2={M.t + PH} stroke={theme.border} />
        <Line x1={M.l} y1={M.t + PH} x2={M.l + PW} y2={M.t + PH} stroke={theme.border} />

        <Line
          x1={gapX}
          y1={M.t}
          x2={gapX}
          y2={M.t + PH}
          stroke={theme.primary}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />
        <Line
          x1={M.l}
          y1={gapY}
          x2={M.l + PW}
          y2={gapY}
          stroke={theme.primary}
          strokeDasharray="4 4"
          strokeOpacity={0.6}
        />

        {[0, 0.5, 1].map((t) => (
          <SvgText
            key={`x${t}`}
            x={x(t)}
            y={M.t + PH + 16}
            textAnchor="middle"
            fontSize="10"
            fill={theme.inkMuted}
          >
            {t * 100}%
          </SvgText>
        ))}
        {[0, 0.5, 1].map((t) => (
          <SvgText
            key={`y${t}`}
            x={M.l - 6}
            y={y(t) + 3}
            textAnchor="end"
            fontSize="10"
            fill={theme.inkMuted}
          >
            {t * 100}%
          </SvgText>
        ))}
        
        <SvgText x={M.l + PW / 2} y={VB.h - 4} textAnchor="middle" fontSize="11" fill={theme.inkMuted}>
          Mật độ công bố →
        </SvgText>

        <SvgText
          x={-(M.t + PH / 2)}
          y={12}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="11"
          fill={theme.inkMuted}
        >
          Mức quan tâm →
        </SvgText>

        {items.map((it, idx) => {
          const selected = it.id === selectedId;
          return (
            <Circle
              key={`${it.id}-${idx}`}
              cx={x(it.density)}
              cy={y(it.interest)}
              r={selected ? 7 : 4}
              fill={resolveColor(it.token)}
              fillOpacity={selected ? 1 : 0.8}
              stroke={selected ? theme.surface : "transparent"}
              strokeWidth={2}
              onPress={() => onSelect(it.id)}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 340 / 260,
  }
});

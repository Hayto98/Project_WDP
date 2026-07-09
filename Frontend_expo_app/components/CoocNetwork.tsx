import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';

interface Props {
  nodes: any[];
  edges: any[];
  selected: Set<string>;
}

export function CoocNetwork({ nodes, edges, selected }: Props) {
  const { theme } = useTheme();

  const shown = nodes.filter(n => selected.has(n.topic));
  const ids = new Set(shown.map(n => n.id));
  const shownEdges = edges.filter(e => ids.has(e.a) && ids.has(e.b));

  const VB = { w: 320, h: 320 };
  const CX = VB.w / 2;
  const CY = VB.h / 2;
  const R = 100;

  const pos: Record<string, any> = {};
  shown.forEach((node, i) => {
    const ang = (i / Math.max(1, shown.length)) * Math.PI * 2 - Math.PI / 2;
    pos[node.id] = { x: CX + Math.cos(ang) * R, y: CY + Math.sin(ang) * R, ang };
  });

  if (shown.length < 2) {
    return (
      <View style={styles.empty}>
        <Text color="inkMuted" variant="sm">Chọn ít nhất 2 chủ đề để dựng mạng đồng xuất hiện từ khóa.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={VB.w} height={VB.h} viewBox={`0 0 ${VB.w} ${VB.h}`}>
          <G>
            {shownEdges.map(e => {
              const pa = pos[e.a];
              const pb = pos[e.b];
              return (
                <Line
                  key={`${e.a}-${e.b}`}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={theme.ink}
                  strokeWidth={1 + e.weight * 0.5}
                  strokeOpacity={0.15 + e.weight * 0.05}
                />
              );
            })}
          </G>
          <G>
            {shown.map(n => {
              const p = pos[n.id];
              const r = 6 + (n.freq / 100) * 15;
              const rightHalf = Math.cos(p.ang) >= -0.01;
              const lx = p.x + Math.cos(p.ang) * (r + 6);
              const ly = p.y + Math.sin(p.ang) * (r + 6);
              
              let colorStr = theme.primary; // fallback
              if (n.topic === 'Large Language Models') colorStr = theme.primary;
              if (n.topic === 'Computer Vision') colorStr = '#8a2be2';
              if (n.topic === 'Federated Learning') colorStr = theme.warning;
              if (n.topic === 'Graph Neural Networks') colorStr = '#ff1493';
              if (n.topic === 'Quantum ML') colorStr = theme.success;
              if (n.topic === 'Edge & TinyML') colorStr = '#ffa500';

              return (
                <G key={n.id}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill={colorStr}
                    stroke={theme.surface}
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={lx}
                    y={ly + 4}
                    textAnchor={rightHalf ? "start" : "end"}
                    fill={theme.ink}
                    fontSize={10}
                    fontWeight="500"
                  >
                    {n.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  }
});

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';
import { IconX } from './icons';

interface Props {
  nodes: any[];
  edges: any[];
  selected: Set<string>;
  topics: any[];
}

export function CoocNetwork({ nodes, edges, selected, topics }: Props) {
  const { theme } = useTheme();
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const shown = [...nodes].filter(n => selected.has(n.topic)).sort((a, b) => b.freq - a.freq).slice(0, 30);
  const ids = new Set(shown.map(n => n.id));
  const baseEdges = edges.filter(e => ids.has(e.a) && ids.has(e.b));

  const shownEdges = activeNodeId 
    ? baseEdges.filter(e => e.a === activeNodeId || e.b === activeNodeId)
    : baseEdges;

  const connectedIds = new Set<string>();
  if (activeNodeId) {
    connectedIds.add(activeNodeId);
    shownEdges.forEach(e => {
      connectedIds.add(e.a);
      connectedIds.add(e.b);
    });
  }

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

  const activeNode = activeNodeId ? shown.find(n => n.id === activeNodeId) : null;
  const linkedNodes = activeNodeId ? shownEdges.map(e => {
    const otherId = e.a === activeNodeId ? e.b : e.a;
    const otherNode = shown.find(n => n.id === otherId);
    return { node: otherNode, weight: e.weight };
  }).filter(o => o.node).sort((a, b) => b.weight - a.weight) : [];

  const totalWeight = shownEdges.reduce((sum, e) => sum + e.weight, 0);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
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
                  stroke={activeNodeId ? theme.primary : theme.ink}
                  strokeWidth={activeNodeId ? 2 + e.weight * 0.5 : 1 + e.weight * 0.5}
                  strokeOpacity={activeNodeId ? 0.6 : 0.15 + e.weight * 0.05}
                  strokeDasharray={activeNodeId ? "4,4" : "none"}
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
              
              const s = topics.find(t => t.key === n.topic);
              const token = s?.token || '--c1';
              let colorStr = theme.primary;
              if (token === '--c1') colorStr = theme.primary;
              if (token === '--c2') colorStr = (theme as any).accent1 || '#8a2be2';
              if (token === '--c3') colorStr = theme.warning;
              if (token === '--c4') colorStr = (theme as any).accent3 || '#ff1493';
              if (token === '--c5') colorStr = theme.success;
              if (token === '--c6') colorStr = (theme as any).accent2 || '#ffa500';

              const isFaded = activeNodeId && !connectedIds.has(n.id);
              const isActive = activeNodeId === n.id;

              return (
                <G key={n.id} onPress={() => setActiveNodeId(isActive ? null : n.id)}>
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? r + 4 : r}
                    fill={colorStr}
                    fillOpacity={isFaded ? 0.2 : 1}
                    stroke={isActive ? theme.ink : theme.surface}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <SvgText
                    x={lx}
                    y={ly + 4}
                    textAnchor={rightHalf ? "start" : "end"}
                    fill={theme.ink}
                    fillOpacity={isFaded ? 0.3 : 1}
                    fontSize={isActive ? 12 : 10}
                    fontWeight={isActive ? "bold" : "500"}
                  >
                    {n.label}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </ScrollView>

      {activeNode && (
        <View style={[styles.detailPanel, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5 }]}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="bold" color="primary">{activeNode.label}</Text>
              <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>Tần suất {activeNode.freq}</Text>
            </View>
            <TouchableOpacity onPress={() => setActiveNodeId(null)} style={{ padding: 4 }}>
              <IconX color={theme.inkMuted} size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.statsRow, { borderBottomColor: theme.border }]}>
            <View style={styles.statBox}>
              <Text variant="heading" weight="bold">{linkedNodes.length}</Text>
              <Text variant="xs" color="inkMuted">LIÊN KẾT</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statBox}>
              <Text variant="heading" weight="bold">{totalWeight}</Text>
              <Text variant="xs" color="inkMuted">TỔNG TRỌNG SỐ</Text>
            </View>
          </View>

          <Text variant="xs" weight="bold" color="inkMuted" style={{ marginTop: 16, marginBottom: 12 }}>TỪ KHÓA LIÊN KẾT</Text>
          
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
            {linkedNodes.map((l, i) => (
              <View key={l.node.id} style={styles.linkRow}>
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <Text variant="sm" style={{ flex: 1, marginLeft: 8 }} numberOfLines={1}>{l.node.label}</Text>
                
                <View style={[styles.barBg, { backgroundColor: theme.surface2 }]}>
                  <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${Math.min(100, (l.weight / 10) * 100)}%` }]} />
                </View>
                
                <Text variant="xs" weight="bold" style={{ width: 30, textAlign: 'right' }}>{l.weight}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    paddingVertical: 16,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  detailPanel: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barBg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  }
});

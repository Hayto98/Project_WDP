import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { IconArrowUp } from './icons';
import { formatInt, formatPercent } from '../lib/format';
import type { Kpi } from '../data/types';

interface Props {
  kpis: Kpi[];
  loading?: boolean;
}

export function KpiStrip({ kpis, loading }: Props) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.container, { flexDirection: 'row', gap: 8 }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.skel, { width: '80%', backgroundColor: theme.border }]} />
            <View style={[styles.skel, { width: '50%', height: 24, marginVertical: 8, backgroundColor: theme.border }]} />
            <View style={[styles.skel, { width: '90%', backgroundColor: theme.border }]} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { flexDirection: 'row', gap: 8 }]}>
      {kpis.map((k) => {
        const isUp = k.deltaKind === 'up';
        const isDown = k.deltaKind === 'down';
        const color = isUp ? theme.success : isDown ? theme.danger : theme.inkMuted;

        return (
          <View key={k.id} style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted" numberOfLines={2}>{k.label}</Text>
            <Text variant="title" weight="bold" style={{ marginVertical: 4 }}>
              {k.format === 'percent' ? formatPercent(k.value) : formatInt(k.value)}
            </Text>
            <View style={styles.hintRow}>
              {isUp && <IconArrowUp color={color} size={12} />}
              <Text variant="xs" style={{ color, marginLeft: isUp ? 2 : 0, fontSize: 10, flex: 1 }} numberOfLines={2}>
                {k.hint}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skel: {
    height: 12,
    borderRadius: 4,
  },
});

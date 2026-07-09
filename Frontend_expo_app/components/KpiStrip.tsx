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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.skel, { width: '60%', backgroundColor: theme.border }]} />
            <View style={[styles.skel, { width: '40%', height: 28, marginVertical: 8, backgroundColor: theme.border }]} />
            <View style={[styles.skel, { width: '70%', backgroundColor: theme.border }]} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={{ paddingRight: 16 }}>
      {kpis.map((k) => {
        const isUp = k.deltaKind === 'up';
        const isDown = k.deltaKind === 'down';
        const color = isUp ? theme.success : isDown ? theme.danger : theme.inkMuted;

        return (
          <View key={k.id} style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="sm" color="inkMuted">{k.label}</Text>
            <Text variant="heading" weight="bold" style={{ marginVertical: 4 }}>
              {k.format === 'percent' ? formatPercent(k.value) : formatInt(k.value)}
            </Text>
            <View style={styles.hintRow}>
              {isUp && <IconArrowUp color={color} size={14} />}
              <Text variant="xs" style={{ color, marginLeft: isUp ? 4 : 0 }}>{k.hint}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  kpiCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
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

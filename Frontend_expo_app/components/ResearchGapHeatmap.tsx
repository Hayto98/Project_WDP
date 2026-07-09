import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import type { GapCell } from '../data/types';
import { formatInt } from '../lib/format';

interface Props {
  fields: string[];
  aspects: string[];
  gaps: GapCell[];
}

export function ResearchGapHeatmap({ fields, aspects, gaps }: Props) {
  const { theme } = useTheme();

  const getHeatColor = (density: number) => {
    // simplified heat colors based on primary theme color
    // from light blue to dark blue based on density (0 to 1)
    const step = Math.min(5, Math.round(density * 5));
    // We use a simplified mapping for react native without doing full CSS var replacement
    // teal sequential ramp
    switch(step) {
      case 0: return theme.themeType === 'dark' ? '#152538' : '#eaf2f9';
      case 1: return theme.themeType === 'dark' ? '#1a334b' : '#cce0f0';
      case 2: return theme.themeType === 'dark' ? '#21496b' : '#99c2e3';
      case 3: return theme.themeType === 'dark' ? '#27628f' : '#66a3d6';
      case 4: return theme.themeType === 'dark' ? '#2e7cb5' : '#3385c9';
      case 5: return theme.themeType === 'dark' ? '#3596dc' : '#0066bc';
      default: return theme.themeType === 'dark' ? '#152538' : '#eaf2f9';
    }
  };

  const getCell = (f: string, a: string) => gaps.find((g) => g.field === f && g.aspect === a);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View style={styles.row}>
            <View style={styles.fieldColHead} />
            {aspects.map(a => (
              <View key={a} style={styles.colHead}>
                <Text variant="xs" color="inkMuted">{a}</Text>
              </View>
            ))}
          </View>

          {/* Grid rows */}
          {fields.map(f => (
            <View key={f} style={styles.row}>
              <View style={styles.fieldCol}>
                <Text variant="xs" weight="bold" numberOfLines={2}>{f}</Text>
              </View>
              {aspects.map(a => {
                const cell = getCell(f, a);
                if (!cell) return <View key={a} style={styles.cell} />;
                return (
                  <View 
                    key={a} 
                    style={[
                      styles.cell, 
                      { backgroundColor: getHeatColor(cell.density) },
                      cell.gap && { borderColor: theme.warning, borderWidth: 2 }
                    ]}
                  >
                    {cell.gap && (
                      <View style={[styles.gapMark, { backgroundColor: theme.warning }]} />
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text variant="xs" color="inkMuted" style={{ marginRight: 8 }}>Ít</Text>
          {[0, 1, 2, 3, 4, 5].map(s => (
            <View key={s} style={[styles.legendSwatch, { backgroundColor: getHeatColor(s/5) }]} />
          ))}
          <Text variant="xs" color="inkMuted" style={{ marginLeft: 8 }}>Nhiều</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.gapMark, { backgroundColor: theme.warning, position: 'relative', top: 0, right: 0, marginRight: 6 }]} />
          <Text variant="xs" color="inkMuted">Khoảng trống tiềm năng</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldColHead: {
    width: 100,
    marginRight: 8,
  },
  colHead: {
    width: 64,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  fieldCol: {
    width: 100,
    marginRight: 8,
    justifyContent: 'center',
  },
  cell: {
    width: 64,
    height: 40,
    borderRadius: 4,
    marginRight: 4,
  },
  gapMark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    transform: [{ rotate: '45deg' }],
  },
  legend: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    marginHorizontal: 1,
  },
});

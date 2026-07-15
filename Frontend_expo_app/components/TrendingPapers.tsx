import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { IconExternal, IconFlame } from './icons';
import { formatInt } from '../lib/format';
import type { TrendingPaper } from '../data/types';

interface Props {
  papers: TrendingPaper[];
}

export function TrendingPapers({ papers }: Props) {
  const { theme } = useTheme();
  const max = Math.max(...papers.map((p) => p.views30d));

  return (
    <View style={styles.container}>
      {papers.map((p, i) => (
        <View key={p.id} style={[styles.item, { borderBottomColor: theme.border }]}>
          <Text variant="title" weight="bold" color="inkMuted" style={styles.rank}>{i + 1}</Text>
          <View style={styles.main}>
            <TouchableOpacity onPress={() => Linking.openURL(p.url)} style={styles.titleRow}>
              <Text variant="body" weight="bold" color="primary" style={{ flex: 1 }}>{p.title}</Text>
              <IconExternal color={theme.primary} size={14} />
            </TouchableOpacity>
            
            <Text variant="xs" color="inkMuted" style={styles.meta}>
              {p.authors} · {p.year} · {p.source}
            </Text>
            
            <View style={[styles.barBg, { backgroundColor: theme.surface2 }]}>
              <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(p.views30d / max) * 100}%` }]} />
            </View>
          </View>
          
          <View style={styles.viewsCol}>
            <View style={styles.viewsNumRow}>
              <IconFlame color={theme.danger} size={14} />
              <Text variant="sm" weight="bold" color="ink" style={{ marginLeft: 4 }}>{formatInt(p.views30d)}</Text>
            </View>
            <Text variant="xs" color="inkMuted">lượt / 30 ngày</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rank: {
    width: 32,
  },
  main: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  meta: {
    marginBottom: 8,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  viewsCol: {
    alignItems: 'flex-end',
    width: 90,
  },
  viewsNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

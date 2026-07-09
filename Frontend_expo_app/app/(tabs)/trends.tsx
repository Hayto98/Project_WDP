import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Widget } from '../../components/Widget';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconTrend, IconSparkle, IconGap } from '../../components/icons';
import { formatCompact, formatInt, formatPercent } from '../../lib/format';
import { TrendChart } from '../../components/TrendChart';
import { CoocNetwork } from '../../components/CoocNetwork';
import { Sparkline } from '../../components/Sparkline';
import { 
  COOC_EDGES, 
  COOC_NODES, 
  TREND_TOPICS, 
  computeGrowth, 
  slicePoints,
  type TrendRange,
  type Granularity 
} from '../../data/trendsSample';

const RANGES: { id: TrendRange; label: string }[] = [
  { id: "12m", label: "12 tháng" },
  { id: "24m", label: "24 tháng" },
  { id: "5y", label: "5 năm" },
];

const GRANS: { id: Granularity; label: string }[] = [
  { id: "year", label: "Năm" },
  { id: "quarter", label: "Quý" },
];

export default function TrendsScreen() {
  const { theme } = useTheme();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(TREND_TOPICS.map((t) => t.key)),
  );
  const [range, setRange] = useState<TrendRange>("5y");
  const [gran, setGran] = useState<Granularity>("year");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 560);
    return () => clearTimeout(t);
  }, [range, gran]);

  const points = useMemo(() => slicePoints(range, gran), [range, gran]);
  const activeSeries = useMemo(() => TREND_TOPICS.filter((t) => selected.has(t.key)), [selected]);
  const growth = useMemo(() => computeGrowth(points).filter((g) => selected.has(g.key)), [points, selected]);

  const totalPublications = useMemo(() => {
    let sum = 0;
    for (const p of points) for (const t of activeSeries) sum += Number(p[t.key]);
    return sum;
  }, [points, activeSeries]);

  const avgGrowth = growth.length ? growth.reduce((a, g) => a + g.cagr, 0) / growth.length : 0;

  const toggleTopic = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allOn = selected.size === TREND_TOPICS.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" weight="bold">Phân tích xu hướng</Text>
            <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
              So sánh diễn biến công bố, tốc độ tăng trưởng và mối liên hệ
            </Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
            {RANGES.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[styles.segBtn, range === r.id && { backgroundColor: theme.surface }]}
                onPress={() => setRange(r.id)}
              >
                <Text variant="xs" weight={range === r.id ? 'bold' : 'normal'} color={range === r.id ? 'ink' : 'inkMuted'}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
            {GRANS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.segBtn, gran === g.id && { backgroundColor: theme.surface }]}
                onPress={() => setGran(g.id)}
              >
                <Text variant="xs" weight={gran === g.id ? 'bold' : 'normal'} color={gran === g.id ? 'ink' : 'inkMuted'}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Topic Selector */}
        <View style={styles.topicBar}>
          <View style={styles.topicChips}>
            {TREND_TOPICS.map(t => {
              const on = selected.has(t.key);
              let colorStr = theme.primary;
              if (t.token === '--c1') colorStr = theme.primary;
              if (t.token === '--c2') colorStr = '#8a2be2';
              if (t.token === '--c3') colorStr = theme.warning;
              if (t.token === '--c4') colorStr = '#ff1493';
              if (t.token === '--c5') colorStr = theme.success;
              if (t.token === '--c6') colorStr = '#ffa500';

              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.topicChip, { borderColor: theme.border }, on && { backgroundColor: colorStr + '20', borderColor: colorStr }]}
                  onPress={() => toggleTopic(t.key)}
                >
                  <View style={[styles.topicDot, { backgroundColor: colorStr }]} />
                  <Text variant="xs" weight={on ? 'bold' : 'normal'} color={on ? 'ink' : 'inkMuted'}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={() => setSelected(allOn ? new Set() : new Set(TREND_TOPICS.map((t) => t.key)))}>
            <Text variant="xs" color="primary" weight="bold" style={{ marginTop: 8 }}>
              {allOn ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={[styles.sumGrid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Chủ đề</Text>
            <Text variant="title" weight="bold">{selected.size}<Text variant="sm" color="inkMuted"> / {TREND_TOPICS.length}</Text></Text>
          </View>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Tổng công bố</Text>
            <Text variant="title" weight="bold">{formatCompact(totalPublications)}</Text>
          </View>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Tăng trưởng TB</Text>
            <Text variant="title" weight="bold" color={avgGrowth > 0 ? 'success' : avgGrowth < 0 ? 'danger' : 'ink'}>
              {formatPercent(Math.round(avgGrowth * 100))}
            </Text>
          </View>
        </View>

        {/* Widgets */}
        <Widget
          title="So sánh xu hướng"
          subtitle="Số công bố theo thời gian"
          icon={<IconTrend color={theme.primary} />}
          status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
          emptyMessage="Chọn ít nhất một chủ đề"
        >
          <TrendChart data={points} series={activeSeries} />
        </Widget>

        <Widget
          title="Tốc độ tăng trưởng"
          subtitle="CAGR sắp xếp giảm dần"
          icon={<IconSparkle color={theme.primary} />}
          status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
          emptyMessage="Chọn ít nhất một chủ đề"
        >
          {growth.map(g => (
            <View key={g.key} style={[styles.growthRow, { borderBottomColor: theme.border }]}>
              <View style={styles.growthMeta}>
                <Text variant="sm" weight="bold">{g.label}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{formatInt(g.latest)} công bố</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Sparkline values={g.trend} token={g.token} />
              </View>
              <View style={styles.growthFigs}>
                <Text variant="sm" weight="bold" color={g.status === 'emerging' ? 'success' : g.status === 'declining' ? 'danger' : 'ink'}>
                  {formatPercent(Math.round(g.cagr * 100))}
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.surface2, marginTop: 4 }]}>
                  <Text variant="xs" color="inkMuted">{g.status === 'emerging' ? 'Nổi lên' : g.status === 'declining' ? 'Suy giảm' : 'Ổn định'}</Text>
                </View>
              </View>
            </View>
          ))}
        </Widget>

        <Widget
          title="Mạng đồng xuất hiện"
          subtitle="Từ khóa thường xuất hiện cùng nhau"
          icon={<IconGap color={theme.primary} />}
          status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
        >
          <CoocNetwork nodes={COOC_NODES} edges={COOC_EDGES} selected={selected} />
        </Widget>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  segBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  topicBar: {
    marginBottom: 20,
  },
  topicChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  topicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  sumGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  sumStat: {
    flex: 1,
  },
  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  growthMeta: {
    flex: 1.5,
  },
  growthFigs: {
    flex: 1,
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

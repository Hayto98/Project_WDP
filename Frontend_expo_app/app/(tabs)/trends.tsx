import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { Widget } from '../../components/Widget';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconTrend, IconSparkle, IconGap } from '../../components/icons';
import { LiveTrendPanel } from '../../components/LiveTrendPanel';
import { formatCompact, formatInt, formatPercent } from '../../lib/format';
import { TrendChart } from '../../components/TrendChart';
import { CoocNetwork } from '../../components/CoocNetwork';
import { Sparkline } from '../../components/Sparkline';
import { analyticsApi } from '../../lib/api';
import type { TrendRange, Granularity, GrowthRow, CoocNode, CoocEdge } from '../../lib/api';
import type { TrendPoint, TrendSeries } from '../../data/types';

const RANGES: { id: TrendRange; label: string }[] = [
  { id: "12m", label: "12 tháng" },
  { id: "24m", label: "24 tháng" },
  { id: "5y", label: "5 năm" },
];

const GRANS: { id: Granularity; label: string }[] = [
  { id: "year", label: "Năm" },
  { id: "quarter", label: "Quý" },
];

const TOPICS_PER_PAGE = 30;

export default function TrendsScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<'corpus' | 'live'>('corpus');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<TrendRange>("5y");
  const [gran, setGran] = useState<Granularity>("year");
  const [loading, setLoading] = useState(true);
  const [topicPage, setTopicPage] = useState(1);
  const [growthPage, setGrowthPage] = useState(1);

  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [topics, setTopics] = useState<TrendSeries[]>([]);
  const [growth, setGrowth] = useState<GrowthRow[]>([]);
  const [networkNodes, setNetworkNodes] = useState<CoocNode[]>([]);
  const [networkEdges, setNetworkEdges] = useState<CoocEdge[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [trendPayload, growthData, networkData] = await Promise.all([
        analyticsApi.trends(range, gran),
        analyticsApi.growth(range, gran),
        analyticsApi.cooccurrence(),
      ]);
      setPoints(trendPayload.points);
      setTopics(trendPayload.series);
      
      const newSelected = new Set(trendPayload.series.map((t: any) => t.key));
      setSelected(newSelected);
      
      setGrowth(growthData.filter((g: any) => newSelected.has(g.key)));
      setNetworkNodes(networkData.nodes);
      setNetworkEdges(networkData.edges);
      
      setTopicPage(1);
      setGrowthPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range, gran]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  const activeSeries = useMemo(() => topics.filter((t) => selected.has(t.key)), [selected, topics]);

  const topSeries = useMemo(() => {
    return [...activeSeries].sort((a, b) => {
      const sumA = points.reduce((acc, p) => acc + (Number(p[a.key]) || 0), 0);
      const sumB = points.reduce((acc, p) => acc + (Number(p[b.key]) || 0), 0);
      return sumB - sumA;
    }).slice(0, 10);
  }, [activeSeries, points]);

  const totalPublications = useMemo(() => {
    let sum = 0;
    for (const p of points) for (const t of activeSeries) sum += Number(p[t.key]) || 0;
    return sum;
  }, [points, activeSeries]);

  const avgGrowth = growth.length ? growth.reduce((a, g) => a + g.cagr, 0) / growth.length : 0;

  const sortedGrowth = useMemo(() => {
    return [...growth].sort((a, b) => b.cagr - a.cagr);
  }, [growth]);

  const toggleTopic = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const allOn = topics.length > 0 && selected.size === topics.length;

  const totalTopicPages = Math.ceil(topics.length / TOPICS_PER_PAGE) || 1;
  const currentTopics = topics.slice((topicPage - 1) * TOPICS_PER_PAGE, topicPage * TOPICS_PER_PAGE);

  const GROWTH_PER_PAGE = 10;
  const totalGrowthPages = Math.ceil(sortedGrowth.length / GROWTH_PER_PAGE) || 1;
  const currentGrowth = sortedGrowth.slice((growthPage - 1) * GROWTH_PER_PAGE, growthPage * GROWTH_PER_PAGE);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={styles.headerText}>
              <Text variant="heading" weight="bold">Phân tích xu hướng</Text>
              <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                {mode === 'corpus' 
                  ? 'So sánh diễn biến công bố, tốc độ tăng trưởng'
                  : 'Phân tích xu hướng từ nguồn trực tuyến'}
              </Text>
            </View>
            <ThemeToggle />
          </View>
          
          <View style={[styles.modeToggle, { backgroundColor: theme.surface2 }]}>
            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'corpus' && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]} 
              onPress={() => setMode('corpus')}
            >
              <Text variant="xs" weight={mode === 'corpus' ? 'bold' : 'normal'} color={mode === 'corpus' ? 'surface' : 'inkMuted'}>Corpus</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'live' && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]} 
              onPress={() => setMode('live')}
            >
              <Text variant="xs" weight={mode === 'live' ? 'bold' : 'normal'} color={mode === 'live' ? 'surface' : 'inkMuted'}>Live</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'live' ? (
          <LiveTrendPanel />
        ) : (
          <>
            {/* Controls */}
            <View style={styles.controlsRow}>
              <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
                {RANGES.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.segBtn, range === r.id && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]}
                    onPress={() => setRange(r.id)}
                  >
                    <Text variant="xs" weight={range === r.id ? 'bold' : 'normal'} color={range === r.id ? 'surface' : 'inkMuted'}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
                {GRANS.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.segBtn, gran === g.id && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]}
                    onPress={() => setGran(g.id)}
                  >
                    <Text variant="xs" weight={gran === g.id ? 'bold' : 'normal'} color={gran === g.id ? 'surface' : 'inkMuted'}>
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Topic Selector */}
            <View style={styles.topicBar}>
              <View style={styles.topicChips}>
                {currentTopics.map(t => {
                  const on = selected.has(t.key);
                  
                  let colorStr = theme.primary;
                  let bgStr = theme.primary;
                  switch (t.token) {
                    case '--c1': colorStr = '#0d9488'; bgStr = 'rgba(13, 148, 136, 0.15)'; break; // teal
                    case '--c2': colorStr = '#6366f1'; bgStr = 'rgba(99, 102, 241, 0.15)'; break; // indigo
                    case '--c3': colorStr = '#d97706'; bgStr = 'rgba(217, 119, 6, 0.15)'; break; // amber
                    case '--c4': colorStr = '#db2777'; bgStr = 'rgba(219, 39, 119, 0.15)'; break; // pink
                    case '--c5': colorStr = '#ea580c'; bgStr = 'rgba(234, 88, 12, 0.15)'; break; // orange
                    case '--c6': colorStr = '#059669'; bgStr = 'rgba(5, 150, 105, 0.15)'; break; // emerald
                    default:
                      // fallback for theme.primary which might be #4cb3d4
                      if (colorStr.startsWith('#') && colorStr.length === 7) {
                        const r = parseInt(colorStr.slice(1, 3), 16);
                        const g = parseInt(colorStr.slice(3, 5), 16);
                        const b = parseInt(colorStr.slice(5, 7), 16);
                        bgStr = `rgba(${r}, ${g}, ${b}, 0.15)`;
                      } else {
                        bgStr = colorStr; // fallback if it's not standard hex
                      }
                  }

                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.topicChip, 
                        { borderColor: on ? colorStr : theme.border, backgroundColor: on ? bgStr : 'transparent' }
                      ]}
                      onPress={() => toggleTopic(t.key)}
                    >
                      <View style={[styles.topicDot, { backgroundColor: on ? colorStr : theme.border }]} />
                      <Text variant="xs" weight={on ? 'bold' : 'normal'} color={on ? 'ink' : 'inkMuted'}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, opacity: topicPage === 1 ? 0.5 : 1 }}
                    disabled={topicPage === 1}
                    onPress={() => setTopicPage(p => Math.max(1, p - 1))}
                  >
                    <Text variant="xs" weight="bold">← Trước</Text>
                  </TouchableOpacity>
                  <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 12 }}>
                    {topicPage} / {totalTopicPages}
                  </Text>
                  <TouchableOpacity 
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, opacity: topicPage === totalTopicPages ? 0.5 : 1 }}
                    disabled={topicPage === totalTopicPages}
                    onPress={() => setTopicPage(p => Math.min(totalTopicPages, p + 1))}
                  >
                    <Text variant="xs" weight="bold">Sau →</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity onPress={() => setSelected(allOn ? new Set() : new Set(topics.map((t) => t.key)))}>
                  <Text variant="xs" color="primary" weight="bold">
                    {allOn ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Stats */}
            <View style={[styles.sumGrid, { backgroundColor: (theme as any).accent2Weak }]}>
              <View style={styles.sumStat}>
                <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Chủ đề</Text>
                <Text variant="title" weight="bold" color="ink">{selected.size}<Text variant="sm" color="ink" style={{ opacity: 0.7 }}> / {topics.length}</Text></Text>
              </View>
              <View style={styles.sumStat}>
                <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Tổng công bố</Text>
                <Text variant="title" weight="bold" color="ink">{formatCompact(totalPublications)}</Text>
              </View>
              <View style={styles.sumStat}>
                <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Tăng trưởng TB</Text>
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
              iconBgColor={theme.primaryWeak}
              status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
              emptyMessage="Chọn ít nhất một chủ đề"
            >
              <TrendChart data={points} series={topSeries} />
            </Widget>

            <Widget
              title="Tốc độ tăng trưởng"
              subtitle="CAGR sắp xếp giảm dần"
              icon={<IconSparkle color={(theme as any).accent3} />}
              iconBgColor={(theme as any).accent3Weak}
              status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
              emptyMessage="Chọn ít nhất một chủ đề"
            >
              {currentGrowth.map(g => {
                let dotColor = theme.primary;
                switch (g.token) {
                  case '--c1': dotColor = '#0d9488'; break;
                  case '--c2': dotColor = '#6366f1'; break;
                  case '--c3': dotColor = '#d97706'; break;
                  case '--c4': dotColor = '#db2777'; break;
                  case '--c5': dotColor = '#ea580c'; break;
                  case '--c6': dotColor = '#059669'; break;
                }

                return (
                  <View key={g.key} style={[styles.growthRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.growthMeta, { flexDirection: 'row', alignItems: 'flex-start' }]}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: dotColor, marginTop: 5, marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text variant="sm" weight="bold">{g.label}</Text>
                        <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{formatInt(g.latest)} công bố</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Sparkline values={g.trend} token={g.token} />
                    </View>
                    <View style={styles.growthFigs}>
                      <Text variant="sm" weight="bold" color={g.status === 'emerging' ? 'success' : g.status === 'declining' ? 'danger' : 'ink'}>
                        {g.cagr > 0 ? '^ +' : g.cagr < 0 ? '↓ ' : ''}{Math.abs(Math.round(g.cagr * 100))}%
                      </Text>
                      <View style={[styles.badge, { backgroundColor: g.status === 'emerging' ? (theme as any).accent4Weak : theme.surface2, marginTop: 4 }]}>
                        <Text variant="xs" color={g.status === 'emerging' ? 'success' : 'inkMuted'}>{g.status === 'emerging' ? 'Nổi lên' : g.status === 'declining' ? 'Suy giảm' : 'Ổn định'}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
                <TouchableOpacity 
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, opacity: growthPage === 1 ? 0.5 : 1 }}
                  disabled={growthPage === 1}
                  onPress={() => setGrowthPage(p => Math.max(1, p - 1))}
                >
                  <Text variant="xs" weight="bold">← Trang trước</Text>
                </TouchableOpacity>
                <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 16 }}>
                  {growthPage} / {totalGrowthPages}
                </Text>
                <TouchableOpacity 
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: theme.border, opacity: growthPage === totalGrowthPages ? 0.5 : 1 }}
                  disabled={growthPage === totalGrowthPages}
                  onPress={() => setGrowthPage(p => Math.min(totalGrowthPages, p + 1))}
                >
                  <Text variant="xs" weight="bold">Trang sau →</Text>
                </TouchableOpacity>
              </View>
            </Widget>

            <Widget
              title="Mạng đồng xuất hiện"
              subtitle="Từ khóa thường xuất hiện cùng nhau"
              icon={<IconGap color={(theme as any).accent1} />}
              iconBgColor={(theme as any).accent1Weak}
              status={loading ? 'loading' : selected.size === 0 ? 'empty' : 'ready'}
            >
              <CoocNetwork nodes={networkNodes} edges={networkEdges} selected={selected} topics={topics} />
            </Widget>

            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seg: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  segBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Widget } from '../../components/Widget';
import { IconTrend, IconGap, IconLibrary, IconSparkle, IconRefresh, IconBookmark } from '../../components/icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardApi } from '../../lib/api';
import type { TimeRange, DashboardData } from '../../data/types';
import { KpiStrip } from '../../components/KpiStrip';
import { TrendChart } from '../../components/TrendChart';
import { ResearchGapHeatmap } from '../../components/ResearchGapHeatmap';
import { TrendingPapers } from '../../components/TrendingPapers';
import { AiInsights } from '../../components/AiInsights';
import { FollowedRail } from '../../components/FollowedRail';

const RANGES: { id: TimeRange; label: string }[] = [
  { id: '12m', label: '12 tháng' },
  { id: '24m', label: '24 tháng' },
  { id: '5y', label: '5 năm' },
];

export default function OverviewScreen() {
  const { theme } = useTheme();
  const [range, setRange] = useState<TimeRange>('12m');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'default' | 'loading' | 'empty' | 'error'>('loading');
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchData();
  }, []); // Note: the actual dashboard API might not take a range parameter yet.

  const fetchData = async () => {
    setLoading(true);
    setView('loading');
    try {
      const result = await dashboardApi.overview();
      setData(result);
      setView('default');
    } catch (err) {
      console.warn('Failed to load dashboard:', err);
      setView('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const status = view === 'loading' || loading
    ? 'loading'
    : view === 'error' ? 'error' : !data ? 'empty' : 'ready';

  const railFirstRun = !data?.followed?.length && !data?.notifications?.length;

  if (view === 'loading' && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Đang tải dữ liệu...</Text>
      </SafeAreaView>
    );
  }

  if (view === 'error' && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text color="danger">Lỗi khi tải dữ liệu tổng quan</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: theme.primary, borderRadius: 8 }} onPress={fetchData}>
          <Text color="surface">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="heading" weight="bold">Tổng quan</Text>
            <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
              Bức tranh xu hướng nghiên cứu & khoảng trống tiềm năng
            </Text>
            <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>
              Cập nhật {data.updatedAt}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <View style={[styles.seg, { backgroundColor: theme.surface2 }]}>
            {RANGES.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.segBtn, 
                  range === r.id && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                ]}
                onPress={() => setRange(r.id)}
              >
                <Text variant="sm" weight={range === r.id ? 'bold' : 'normal'} color={range === r.id ? 'ink' : 'inkMuted'}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
              <IconRefresh color={theme.ink} />
            </TouchableOpacity>
            <ThemeToggle />
          </View>
        </View>

        {/* KPI Strip */}
        <KpiStrip kpis={data.kpis} loading={status === 'loading'} />

        {/* Widgets */}
        <Widget
          title="Xu hướng công bố"
          subtitle="Số bài báo / năm theo lĩnh vực"
          icon={<IconTrend color={theme.primary} />}
          status={status}
          onRetry={() => setView('default')}
        >
          <TrendChart data={data.trend || []} series={data.trendSeries || []} />
        </Widget>

        <Widget
          title="Bản đồ khoảng trống"
          subtitle="Mật độ công bố theo lĩnh vực × khía cạnh"
          icon={<IconGap color={theme.primary} />}
          status={status}
          onRetry={() => setView('default')}
        >
          <ResearchGapHeatmap fields={data.gapFields.map(f => f.label)} aspects={data.gapAspects.map(a => a.label)} gaps={data.gaps || []} />
        </Widget>

        <Widget
          title="Top bài báo thịnh hành"
          subtitle="Theo lượt xem 30 ngày qua"
          icon={<IconLibrary color={theme.primary} />}
          status={status}
          onRetry={() => setView('default')}
        >
          <TrendingPapers papers={data.trending} />
        </Widget>

        <Widget
          title="Phân tích từ AI"
          subtitle="Tóm tắt & gợi ý hướng nghiên cứu"
          icon={<IconSparkle color={theme.primary} />}
          status={status}
          onRetry={() => setView('default')}
        >
          <AiInsights ai={data.ai} />
        </Widget>

        <Widget
          title="Không gian của bạn"
          icon={<IconBookmark color={theme.primary} />}
          status={railFirstRun ? 'empty' : status === 'loading' ? 'loading' : 'ready'}
          onRetry={() => setView('default')}
          emptyMessage="Bạn chưa theo dõi chủ đề nào"
        >
          <FollowedRail followed={data.followed} notifications={data.notifications} />
        </Widget>
        
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
});

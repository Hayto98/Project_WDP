import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Widget } from '../../components/Widget';
import { IconTrend, IconGap, IconLibrary, IconSparkle, IconRefresh, IconBookmark, IconBell } from '../../components/icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dashboardApi, notificationApi } from '../../lib/api';
import type { TimeRange, DashboardData } from '../../data/types';
import { KpiStrip } from '../../components/KpiStrip';
import { TrendChart } from '../../components/TrendChart';
import { ResearchGapHeatmap } from '../../components/ResearchGapHeatmap';
import { TrendingPapers } from '../../components/TrendingPapers';
import { AiInsights } from '../../components/AiInsights';
import { FollowedRail } from '../../components/FollowedRail';

import { useNotifications } from '../../context/NotificationContext';

export default function OverviewScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { unreadCount } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'default' | 'loading' | 'empty' | 'error'>('loading');
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
        <TouchableOpacity style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.primary, borderRadius: 999, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 }} onPress={fetchData}>
          <Text color="surface" weight="bold">Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text variant="heading" weight="bold">Tổng quan</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')} style={{ position: 'relative' }}>
                <IconBell color={theme.ink} size={20} />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -5, right: -5, backgroundColor: theme.danger,
                    borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
                    paddingHorizontal: 4, borderWidth: 1, borderColor: theme.bg
                  }}>
                    <Text variant="xs" weight="bold" style={{ color: '#fff', fontSize: 10, lineHeight: 12, textAlign: 'center' }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <ThemeToggle />
            </View>
          </View>
          <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
            Bức tranh xu hướng nghiên cứu & khoảng trống tiềm năng
          </Text>
          <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>
            Cập nhật {data.updatedAt}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success || '#10b981' }} />
            <Text variant="sm" color="inkMuted" weight="bold">Dữ liệu thời gian thực</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
              <IconRefresh color={theme.ink} />
            </TouchableOpacity>
          </View>
        </View>

        {/* KPI Strip */}
        <KpiStrip kpis={data.kpis} loading={status === 'loading'} />

        {/* Widgets */}
        <Widget
          title="Xu hướng công bố"
          subtitle="Số bài báo / năm theo lĩnh vực"
          icon={<IconTrend color={theme.primary} />}
          iconBgColor={theme.primaryWeak}
          status={status}
          onRetry={() => setView('default')}
        >
          <TrendChart data={data.trend || []} series={data.trendSeries || []} />
        </Widget>

        <Widget
          title="Cơ hội nghiên cứu nổi bật"
          subtitle="Top các khoảng trống tiềm năng"
          icon={<IconGap color={(theme as any).accent1} />}
          iconBgColor={(theme as any).accent1Weak}
          status={status}
          onRetry={() => setView('default')}
        >
          <View style={{ padding: 16 }}>
            {(() => {
              const items = (data.gaps || [])
                .filter(i => i.gap || i.density <= 0.35)
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 5);

              if (items.length === 0) return <Text variant="sm" color="inkMuted">Chưa có dữ liệu khoảng trống</Text>;

              function withOpacity(color: string, opacity: number) {
                if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`);
                if (color.startsWith('#') && color.length === 7) return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
                return color;
              }

              function degreeFor(score: number) {
                if (score >= 0.7) return { label: "Rất cao", color: theme.success || '#10b981' };
                if (score >= 0.5) return { label: "Cao", color: theme.primary };
                if (score >= 0.3) return { label: "Trung bình", color: theme.warning || '#f59e0b' };
                return { label: "Thấp", color: theme.danger || '#ef4444' };
              }

              return items.map((g, idx) => {
                const degree = degreeFor(g.score || 0);
                return (
                  <TouchableOpacity
                    key={`${g.field}-${g.aspect}`}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: idx === items.length - 1 ? 0 : 1, borderBottomColor: theme.border }}
                    onPress={() => router.push('/(tabs)/gap')}
                  >
                    <Text variant="sm" color="inkMuted" style={{ width: 24, textAlign: 'center' }}>{idx + 1}</Text>
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text variant="sm" weight="bold">{g.field}</Text>
                      <Text variant="xs" color="inkMuted">{g.aspect}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: withOpacity(degree.color, 0.2), marginRight: 12 }}>
                      <Text variant="xs" weight="bold" style={{ color: degree.color }}>{degree.label}</Text>
                    </View>
                    <View style={{ width: 60, alignItems: 'flex-end' }}>
                      <Text variant="xs" weight="bold" style={{ marginBottom: 4 }}>Điểm {Math.round((g.score || 0) * 100)}</Text>
                      <View style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: theme.border, overflow: 'hidden' }}>
                        <View style={{ height: '100%', borderRadius: 2, width: `${Math.round((g.score || 0) * 100)}%`, backgroundColor: theme.primary }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              });
            })()}
            <TouchableOpacity style={{ marginTop: 12, paddingVertical: 8, alignItems: 'center' }} onPress={() => router.push('/(tabs)/gap')}>
              <Text variant="sm" weight="bold" color="primary">Xem toàn bộ →</Text>
            </TouchableOpacity>
          </View>
        </Widget>

        <Widget
          title="Top bài báo thịnh hành"
          subtitle="Theo lượt xem 30 ngày qua"
          icon={<IconLibrary color={(theme as any).accent2} />}
          iconBgColor={(theme as any).accent2Weak}
          status={status}
          onRetry={() => setView('default')}
        >
          <TrendingPapers papers={data.trending} />
        </Widget>

        <Widget
          title="Phân tích từ AI"
          subtitle="Tóm tắt & gợi ý hướng nghiên cứu"
          icon={<IconSparkle color={(theme as any).accent3} />}
          iconBgColor={(theme as any).accent3Weak}
          status={status}
          onRetry={() => setView('default')}
        >
          <AiInsights ai={data.ai} />
        </Widget>

        <Widget
          title="Không gian của bạn"
          icon={<IconBookmark color={(theme as any).accent4} />}
          iconBgColor={(theme as any).accent4Weak}
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

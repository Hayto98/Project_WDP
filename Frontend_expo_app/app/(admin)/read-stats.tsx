import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { adminApi, PaperReadLog } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

interface TopReadPaper {
  paperId: string;
  paperTitle: string;
  topic: string;
  source: string;
  reads: number;
  readers: number;
  totalMinutes: number;
  latestAt: string;
}

interface ReadChartItem {
  id: string;
  label: string;
  value: number;
  detail: string;
}

function buildTopReadPapers(logs: PaperReadLog[]): TopReadPaper[] {
  const map = new Map<string, TopReadPaper & { readerEmails: Set<string> }>();
  for (const log of logs) {
    if (log.persistStatus !== "stored") continue;
    const current = map.get(log.paperId) ?? {
      paperId: log.paperId,
      paperTitle: log.paperTitle,
      topic: log.topic,
      source: log.source,
      reads: 0,
      readers: 0,
      totalMinutes: 0,
      latestAt: log.viewedAt,
      readerEmails: new Set<string>(),
    };
    current.reads += 1;
    current.totalMinutes += log.durationMinutes;
    current.latestAt = log.viewedAt > current.latestAt ? log.viewedAt : current.latestAt;
    current.readerEmails.add(log.userEmail);
    current.readers = current.readerEmails.size;
    map.set(log.paperId, current);
  }
  return Array.from(map.values())
    .map(({ readerEmails: _readerEmails, ...paper }) => paper)
    .sort((a, b) => b.reads - a.reads || b.totalMinutes - a.totalMinutes);
}

function buildTopicInterest(logs: PaperReadLog[]): ReadChartItem[] {
  const map = new Map<string, { reads: number; minutes: number; papers: Set<string> }>();
  for (const log of logs) {
    if (log.persistStatus !== "stored") continue;
    const current = map.get(log.topic) ?? { reads: 0, minutes: 0, papers: new Set<string>() };
    current.reads += 1;
    current.minutes += log.durationMinutes;
    current.papers.add(log.paperId);
    map.set(log.topic, current);
  }
  return Array.from(map.entries())
    .map(([topic, value]) => ({
      id: topic,
      label: topic,
      value: value.reads,
      detail: `${value.papers.size} paper · ${Math.round(value.minutes)} phút đọc`,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildWindowStats(logs: PaperReadLog[]): ReadChartItem[] {
  const map = new Map<string, { events: number; stored: number }>();
  for (const log of logs) {
    const current = map.get(log.sessionWindow) ?? { events: 0, stored: 0 };
    current.events += 1;
    if (log.persistStatus === "stored") current.stored += 1;
    map.set(log.sessionWindow, current);
  }
  return Array.from(map.entries())
    .map(([window, value]) => ({
      id: window,
      label: window,
      value: value.events,
      detail: `${value.stored} record đã ghi DB`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function formatReadDuration(log: PaperReadLog) {
  const seconds = Math.max(0, Math.round((log as any).durationSeconds ?? log.durationMinutes * 60));
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes} phút ${remainder} giây` : `${minutes} phút`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ReadStatsScreen() {
  const { theme } = useTheme();
  const [readLogs, setReadLogs] = useState<PaperReadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setNotice('');
    try {
      const logs = await adminApi.paperReads();
      setReadLogs(logs);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', 'Không lấy được thống kê lượt đọc');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAction = (action: string) => {
    if (action === 'refresh') {
      setNotice('Đã làm mới thống kê lượt đọc từ bảng paper_read_stats_30m.');
      fetchStats();
    } else if (action === 'export') {
      setNotice('Đã tạo file báo cáo CSV demo cho top paper được đọc nhiều.');
    } else if (action === 'threshold') {
      setNotice('Ngưỡng ghi DB hiện tại: chỉ tính lượt đọc từ 2 phút trở lên.');
    } else if (action === 'raw') {
      setNotice('Đang hiển thị cả event thô và trạng thái ghi database.');
    }
  };

  const { uniqueReaders, storedReadLogs, avgReadMinutes } = useMemo(() => {
    const emails = new Set<string>();
    let storedCount = 0;
    let totalMins = 0;
    readLogs.forEach(log => {
      if (log.userEmail) emails.add(log.userEmail);
      if (log.persistStatus === 'stored') {
        storedCount++;
        totalMins += log.durationMinutes;
      }
    });
    return {
      uniqueReaders: emails.size,
      storedReadLogs: storedCount,
      avgReadMinutes: storedCount > 0 ? Math.round(totalMins / storedCount) : 0
    };
  }, [readLogs]);

  const topReadPapers = useMemo(() => buildTopReadPapers(readLogs), [readLogs]);
  const topicInterest = useMemo(() => buildTopicInterest(readLogs), [readLogs]);
  const windowStats = useMemo(() => buildWindowStats(readLogs), [readLogs]);

  const BarChart = ({ items, unit }: { items: ReadChartItem[], unit: string }) => {
    if (!items.length) return <Text variant="xs" color="inkMuted">Chưa có dữ liệu</Text>;
    const maxVal = Math.max(...items.map(i => i.value), 1);
    
    return (
      <View style={{ marginTop: 8 }}>
        {items.map(item => (
          <View key={item.id} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text variant="sm" weight="bold" numberOfLines={1} style={{ flex: 1, paddingRight: 16 }}>{item.label}</Text>
              <Text variant="xs" color="inkMuted">{item.value} {unit}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.barFill, { backgroundColor: theme.primary, width: `${(item.value / maxVal) * 100}%` }]} />
              </View>
            </View>
            <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>{item.detail}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: '100%' }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text variant="lead" weight="bold">Thống kê lượt đọc paper</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
  </View>
  </View>
  <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
          Paper trong database đang được đọc nhiều và event ghi thống kê theo cửa sổ 30 phút
        </Text>
</View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Lượt xem ghi nhận</Text>
            <Text variant="lead" weight="bold" style={{ marginTop: 4 }}>{readLogs.length}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">User duy nhất</Text>
            <Text variant="lead" weight="bold" style={{ marginTop: 4 }}>{uniqueReaders}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Đã ghi database</Text>
            <Text variant="lead" weight="bold" style={{ marginTop: 4 }}>{storedReadLogs}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Thời lượng TB</Text>
            <Text variant="lead" weight="bold" style={{ marginTop: 4 }}>{avgReadMinutes}p</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => handleAction('refresh')}>
              <Ionicons name="refresh" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text variant="xs" weight="bold" style={{ color: '#fff' }}>Làm mới thống kê</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleAction('export')}>
              <Text variant="xs" style={{ color: theme.ink }}>Xuất báo cáo CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleAction('threshold')}>
              <Text variant="xs" style={{ color: theme.ink }}>Cấu hình ngưỡng ghi DB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleAction('raw')}>
              <Text variant="xs" style={{ color: theme.ink }}>Xem event thô</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {notice ? (
          <View style={[styles.notice, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" style={{ color: theme.ink }}>{notice}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 16 }}>
            {/* Top Papers */}
            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }}>
                <Text variant="body" weight="bold">Bài báo được quan tâm</Text>
                <Text variant="xs" color="inkMuted">Top paper đã ghi database</Text>
              </View>
              <BarChart items={topReadPapers.map(p => ({
                id: p.paperId,
                label: p.paperTitle,
                value: p.reads,
                detail: `${p.readers} user · ${p.totalMinutes} phút · ${p.topic}`
              }))} unit="lượt" />
            </View>

            {/* Top Fields */}
            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }}>
                <Text variant="body" weight="bold">Lĩnh vực được quan tâm</Text>
                <Text variant="xs" color="inkMuted">Gom theo topic của paper</Text>
              </View>
              <BarChart items={topicInterest} unit="lượt" />
            </View>

            {/* Time buckets */}
            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12 }}>
                <Text variant="body" weight="bold">Phân bổ cửa sổ 30 phút</Text>
                <Text variant="xs" color="inkMuted">Event đọc theo time bucket</Text>
              </View>
              <BarChart items={windowStats} unit="event" />
            </View>

            {/* Top Read Papers List */}
            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border, padding: 0, overflow: 'hidden' }]}>
              <View style={{ padding: 16, backgroundColor: theme.bg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text variant="body" weight="bold">Paper đang được đọc nhiều trong database</Text>
                <Text variant="xs" color="inkMuted">Xếp hạng theo record đã ghi DB</Text>
              </View>
              
              <View style={{ padding: 12, gap: 8 }}>
                {topReadPapers.map((paper, index) => (
                  <View key={paper.paperId} style={[styles.topPaperCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.primary + '15' }]}>
                      <Text variant="sm" weight="bold" style={{ color: theme.primary }}>#{index + 1}</Text>
                    </View>
                    
                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                      <Text variant="sm" weight="bold" numberOfLines={2}>{paper.paperTitle}</Text>
                      <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                        {paper.source} · {paper.topic} · cập nhật gần nhất {paper.latestAt}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="sm" weight="bold">{paper.reads}</Text>
                        <Text variant="xs" color="inkMuted">lượt đọc</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="sm" weight="bold">{paper.readers}</Text>
                        <Text variant="xs" color="inkMuted">user</Text>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text variant="sm" weight="bold">{Math.round(paper.totalMinutes)}p</Text>
                        <Text variant="xs" color="inkMuted">thời lượng</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ marginVertical: 16 }}>
              <Text variant="xs" color="inkMuted" style={{ lineHeight: 18 }}>
                Quy tắc demo: chỉ cộng vào thống kê khi paper đã có trong database và user đọc đủ ngưỡng, ví dụ từ 2 phút trở lên. Event quá ngắn vẫn hiện trong log kỹ thuật nhưng không tính vào top quan tâm.
              </Text>
            </View>

            {/* Raw Events List */}
            <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border, padding: 0, overflow: 'hidden' }]}>
              <View style={{ padding: 16, backgroundColor: theme.bg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text variant="body" weight="bold">Log hệ thống (Event thô)</Text>
              </View>
              
              <View style={{ padding: 12, gap: 12 }}>
                {readLogs.slice(0, 50).map((log) => (
                  <View key={log.id} style={[styles.rawLogCard, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                        <Text variant="sm" weight="bold" style={{ color: '#fff' }}>{initials(log.userName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="sm" weight="bold">{log.userName}</Text>
                        <Text variant="xs" color="inkMuted">{log.userEmail}</Text>
                      </View>
                    </View>
                    
                    <View style={{ marginBottom: 12 }}>
                      <Text variant="sm" weight="bold" numberOfLines={2}>{log.paperTitle}</Text>
                      <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>{log.topic}</Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                      <View>
                        <Text variant="xs" color="inkMuted">Nguồn</Text>
                        <Text variant="sm" weight="bold">{log.source}</Text>
                      </View>
                      <View>
                        <Text variant="xs" color="inkMuted">Thời điểm</Text>
                        <Text variant="sm" weight="bold">{log.viewedAt}</Text>
                      </View>
                      <View>
                        <Text variant="xs" color="inkMuted">Thời lượng</Text>
                        <Text variant="sm" weight="bold">{formatReadDuration(log)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  content: { padding: 16 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: '47%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  notice: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  panel: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  topPaperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rawLogCard: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

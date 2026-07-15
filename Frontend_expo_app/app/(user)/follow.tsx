import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconChevron, IconPlus, IconSearch, IconBell, IconBookmark, IconExternal } from '../../components/icons';
import { KpiStrip } from '../../components/KpiStrip';
import { Widget } from '../../components/Widget';
import { followApi } from '../../lib/api';
import { makeFollowAlerts } from '../../data/followSample';
import type { FollowSubject, FollowAlert } from '../../lib/api';
import type { Kpi } from '../../data/types';
import type { FollowAlertEntry } from '../../data/followSample';

type FeedFilter = 'all' | 'unread' | 'high';

export default function FollowScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [subjects, setSubjects] = useState<FollowSubject[]>([]);
  const [alerts, setAlerts] = useState<FollowAlert[]>([]);
  const [activeId, setActiveId] = useState('all');
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextSubjects, nextAlerts] = await Promise.all([
        followApi.subjects(),
        followApi.alerts(),
      ]);
      setSubjects(nextSubjects);
      setAlerts(nextAlerts);
      if (nextSubjects.length > 0) setActiveId('all');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const entries = useMemo(() => makeFollowAlerts(subjects, alerts), [subjects, alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = entries.filter((entry) => {
      const hay = [
        entry.subject.label,
        entry.paper.title,
        entry.paper.authors.join(' '),
        entry.paper.source,
        entry.reason,
      ].join(' ').toLowerCase();

      if (activeId !== 'all' && entry.subjectId !== activeId) return false;
      if (filter === 'unread' && !entry.unread) return false;
      if (filter === 'high' && entry.priority !== 'high') return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });

    // Sort newest first based on original alerts order
    rows.sort((a, b) => {
      return alerts.findIndex(x => x.id === a.id) - alerts.findIndex(x => x.id === b.id);
    });
    return rows;
  }, [entries, activeId, filter, query, alerts]);

  const unreadCount = alerts.filter(a => a.unread).length;
  const activeCount = subjects.filter(s => s.active).length;
  const highCount = alerts.filter(a => a.priority === 'high').length;

  const kpis: Kpi[] = [
    { id: '1', label: 'Mục đang bật', value: activeCount, format: 'int', hint: '' },
    { id: '2', label: 'Thông báo chưa đọc', value: unreadCount, format: 'int', deltaKind: unreadCount > 0 ? 'up' : 'neutral', hint: unreadCount > 0 ? 'Có thông báo mới' : 'Đã xem hết' },
    { id: '3', label: 'Ưu tiên cao', value: highCount, format: 'int', hint: '' },
    { id: '4', label: 'Bài mới 7 ngày', value: entries.length, format: 'int', hint: '' },
  ];

  const handleAdd = async () => {
    // Basic placeholder for adding a subject
    try {
      const added = await followApi.addSubject({ type: 'keyword', value: 'New Topic' });
      setSubjects(curr => [...curr, added]);
    } catch (e) {
      console.error(e);
    }
  };

  const markRead = async (id: string) => {
    setAlerts(curr => curr.map(a => a.id === id ? { ...a, unread: false } : a));
    try {
      await followApi.markAlertRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          {/* using IconChevron rotated for back button, or a custom IconArrowLeft */}
          <IconChevron color={theme.ink} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="heading" weight="bold">Theo dõi</Text>
          <Text variant="xs" color="inkMuted" numberOfLines={1}>Quản lý chủ đề và luồng bài mới</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={{ marginBottom: 16 }}>
          <KpiStrip kpis={kpis} loading={loading} />
        </View>

        {/* Subjects List */}
        <View style={{ marginBottom: 24 }}>
          <Text variant="sm" weight="bold" style={{ marginBottom: 12 }}>Mục theo dõi</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
            <TouchableOpacity 
              style={[
                styles.subjectChip, 
                { backgroundColor: theme.surface, borderColor: theme.border },
                activeId === 'all' && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
              ]}
              onPress={() => setActiveId('all')}
            >
              <Text variant="sm" weight={activeId === 'all' ? 'bold' : 'normal'} color={activeId === 'all' ? 'primary' : 'ink'}>Tất cả</Text>
            </TouchableOpacity>
            
            {subjects.map(sub => {
              const isActive = activeId === sub.id;
              return (
                <TouchableOpacity 
                  key={sub.id}
                  style={[
                    styles.subjectChip, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isActive && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => setActiveId(sub.id)}
                >
                  <Text variant="sm" weight={isActive ? 'bold' : 'normal'} color={isActive ? 'primary' : 'ink'}>{sub.label}</Text>
                </TouchableOpacity>
              )
            })}

            <TouchableOpacity style={[styles.subjectChip, { backgroundColor: theme.surface, borderColor: theme.border, borderStyle: 'dashed' }]} onPress={handleAdd}>
              <IconPlus color={theme.primary} size={16} style={{ marginRight: 4 }} />
              <Text variant="sm" color="primary">Thêm</Text>
            </TouchableOpacity>
            <View style={{ width: 32 }} />
          </ScrollView>
        </View>

        {/* Feed section */}
        <Widget title="Tất cả thông báo" subtitle={`${filtered.length} thông báo khớp bộ lọc`} status="ready">
          
          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, { backgroundColor: theme.surface2 }]}>
              <TouchableOpacity style={[styles.filterBtn, filter === 'all' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('all')}>
                <Text variant="xs" weight={filter === 'all' ? 'bold' : 'normal'}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'unread' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('unread')}>
                <Text variant="xs" weight={filter === 'unread' ? 'bold' : 'normal'}>Chưa đọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'high' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('high')}>
                <Text variant="xs" weight={filter === 'high' ? 'bold' : 'normal'}>Ưu tiên</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <IconSearch color={theme.inkMuted} size={18} />
            <TextInput 
              style={[styles.searchInput, { color: theme.ink }]} 
              placeholder="Tìm bài báo, tác giả..." 
              placeholderTextColor={theme.inkMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconBell color={theme.inkMuted} size={32} />
              <Text variant="body" color="inkMuted" style={{ marginTop: 12, textAlign: 'center' }}>Không có thông báo nào khớp.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              {filtered.map(entry => (
                <TouchableOpacity 
                  key={entry.id} 
                  style={[
                    styles.alertCard, 
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    entry.unread && { borderLeftWidth: 3, borderLeftColor: theme.primary }
                  ]}
                  onPress={() => {
                    if (entry.unread) markRead(entry.id);
                  }}
                >
                  <View style={styles.alertHeader}>
                    <Text variant="xs" color="primary" weight="bold">{entry.subject.label}</Text>
                    {entry.priority === 'high' && (
                      <View style={[styles.badge, { backgroundColor: theme.danger + '20' }]}>
                        <Text variant="xs" color="danger" weight="bold">Cao</Text>
                      </View>
                    )}
                  </View>
                  <Text variant="sm" weight="bold" style={{ marginVertical: 4 }}>{entry.paper.title}</Text>
                  <Text variant="xs" color="inkMuted" numberOfLines={1}>{entry.paper.authors.join(', ')}</Text>
                  <View style={[styles.alertFooter, { borderTopColor: theme.border }]}>
                    <Text variant="xs" color="inkMuted">{entry.reason}</Text>
                    <IconExternal color={theme.inkMuted} size={14} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
        </Widget>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  scroll: {
    padding: 16,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  }
});

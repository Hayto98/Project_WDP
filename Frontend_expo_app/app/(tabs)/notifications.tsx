import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { notificationApi } from '../../lib/api';
import type { NotificationItem } from '../../lib/api';
import { IconAlert, IconBell, IconExternal, IconFilter, IconGrid, IconLibrary, IconTrend, IconArrowLeft, IconChevron } from '../../components/icons';

type NotificationKind = "task" | "invite" | "comment" | "paper" | "trend" | "system";
type InboxFilter = "all" | "unread" | NotificationKind;

const FILTERS: { id: InboxFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "unread", label: "Chưa đọc" },
  { id: "task", label: "Task" },
  { id: "invite", label: "Lời mời" },
  { id: "comment", label: "Bình luận" },
  { id: "system", label: "Tín hiệu hệ thống" },
];

const KIND_LABEL: Record<NotificationKind, string> = {
  task: "Task",
  invite: "Lời mời",
  comment: "Bình luận",
  paper: "Paper mới",
  trend: "Xu hướng",
  system: "Tín hiệu hệ thống",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "Ưu tiên cao",
  normal: "Bình thường",
  low: "Thông tin",
};

function iconForKind(kind: string) {
  if (kind === "task") return IconGrid;
  if (kind === "invite") return IconBell;
  if (kind === "paper") return IconLibrary;
  if (kind === "trend") return IconTrend;
  if (kind === "system") return IconAlert;
  return IconBell;
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const items = await notificationApi.list();
      setNotifications(items);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchNotifications().finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const filtered = useMemo(() => {
    return notifications.filter((item) => {
      if (filter === "all") return true;
      if (filter === "unread") return item.unread;
      return item.kind === filter;
    });
  }, [filter, notifications]);

  const unreadCount = notifications.filter((item) => item.unread).length;
  const highCount = notifications.filter((item) => item.priority === "high").length;
  const taskCount = notifications.filter((item) => item.kind === "task" || item.kind === "comment").length;
  const inviteCount = notifications.filter((item) => item.kind === "invite").length;
  const systemCount = notifications.filter((item) => item.kind === "system").length;

  const markRead = (id: string, unread: boolean) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, unread } : item)));
    if (!unread) notificationApi.markRead(id).catch(() => undefined);
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    notificationApi.markAllRead().catch(() => undefined);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      markRead(id, false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <IconArrowLeft color={theme.ink} size={24} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text variant="lead" weight="bold">Hộp thư</Text>
            <Text variant="xs" color="inkMuted" numberOfLines={1}>Cập nhật task, bình luận và tín hiệu hệ thống</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.markAllBtn, { opacity: unreadCount === 0 ? 0.5 : 1 }]}
            onPress={markAllRead}
            disabled={unreadCount === 0}
          >
            <Text variant="xs" weight="bold" color="primary">Đánh dấu đã đọc</Text>
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        
        {/* Summary */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll} contentContainerStyle={{ gap: 12 }}>
          <View style={[styles.sumStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Chưa đọc</Text>
            <Text variant="title" weight="bold">{unreadCount}</Text>
          </View>
          <View style={[styles.sumStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Ưu tiên cao</Text>
            <Text variant="title" weight="bold">{highCount}</Text>
          </View>
          <View style={[styles.sumStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Task & B.luận</Text>
            <Text variant="title" weight="bold">{taskCount}</Text>
          </View>
          <View style={[styles.sumStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Lời mời</Text>
            <Text variant="title" weight="bold">{inviteCount}</Text>
          </View>
          <View style={[styles.sumStat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="xs" color="inkMuted">Hệ thống</Text>
            <Text variant="title" weight="bold">{systemCount}</Text>
          </View>
        </ScrollView>

        {/* Filters */}
        <View style={[styles.filterContainer, { borderColor: theme.border }]}>
          <View style={styles.filterIconBox}>
            <IconFilter size={16} color={theme.inkMuted} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingRight: 16 }}>
            {FILTERS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.filterBtn,
                  filter === item.id ? { backgroundColor: theme.ink } : { backgroundColor: theme.surface }
                ]}
                onPress={() => setFilter(item.id)}
              >
                <Text variant="xs" weight="bold" color={filter === item.id ? 'surface' : 'ink'}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <IconBell size={48} color={theme.inkMuted} />
            <Text variant="lead" weight="bold" style={{ marginTop: 16 }}>Hộp thư trống</Text>
            <Text variant="body" color="inkMuted" style={{ textAlign: 'center', marginTop: 8 }}>
              Bạn sẽ thấy task được giao, lời mời cộng tác, bình luận và tín hiệu bảo trì từ admin tại đây.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            {filtered.map((item) => {
              const isExpanded = expandedId === item.id;
              const Icon = iconForKind(item.kind);
              
              return (
                <View 
                  key={item.id} 
                  style={[
                    styles.notificationCard, 
                    { backgroundColor: item.unread ? theme.surface2 : theme.surface, borderColor: theme.border },
                    isExpanded && { borderColor: theme.primary }
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.notificationHeader}
                    onPress={() => toggleExpand(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCol}>
                      <View style={[styles.iconCircle, { backgroundColor: theme.bg }]}>
                        <Icon size={16} color={item.unread ? theme.primary : theme.inkMuted} />
                      </View>
                      {item.unread && <View style={[styles.unreadDot, { backgroundColor: theme.danger }]} />}
                    </View>
                    <View style={styles.contentCol}>
                      <Text variant="body" weight={item.unread ? 'bold' : 'normal'}>{item.title}</Text>
                      {!isExpanded && <Text variant="sm" color="inkMuted" numberOfLines={1} style={{ marginTop: 4 }}>{item.body}</Text>}
                      <View style={styles.metaRow}>
                        <Text variant="xs" color="inkMuted">{item.time}</Text>
                        <Text variant="xs" color="inkMuted"> • {item.source}</Text>
                      </View>
                    </View>
                    <View style={styles.priorityCol}>
                      {item.priority === 'high' && (
                        <View style={[styles.priorityBadge, { backgroundColor: theme.danger.replace('hsl(', 'hsla(').replace(')', ', 0.15)') }]}>
                          <Text variant="xs" color="danger" weight="bold">Cao</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
                      <Text variant="body" style={{ marginBottom: 12 }}>{item.body}</Text>
                      
                      <View style={[styles.detailsGrid, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                        <View style={styles.detailItem}>
                          <Text variant="xs" color="inkMuted">Nguồn</Text>
                          <Text variant="sm" weight="bold">{item.source}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text variant="xs" color="inkMuted">Người gửi</Text>
                          <Text variant="sm" weight="bold">{item.actor}</Text>
                        </View>
                        {item.meta && item.meta.length > 0 && (
                          <View style={styles.detailItem}>
                            <Text variant="xs" color="inkMuted">Nhãn</Text>
                            <Text variant="sm" weight="bold">{item.meta.join(', ')}</Text>
                          </View>
                        )}
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, flexDirection: 'row', alignItems: 'center' }} style={{ marginTop: 8 }}>
                        {item.targetHref ? (
                          <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: theme.primary, justifyContent: 'center' }]}
                            onPress={() => {
                              if (item.targetHref.startsWith('http')) {
                                Linking.openURL(item.targetHref);
                              } else {
                                let route = item.targetHref.replace(/^#/, '');
                                if (route === 'overview') route = '';
                                
                                const [baseRoute] = route.split('?');
                                const tabRoutes = ['workspace', 'follow', 'gap', 'account', 'notifications', 'library', 'search', 'trends', 'menu'];
                                
                                if (baseRoute === 'notifications') {
                                  markRead(item.id, false);
                                  setExpandedId(null);
                                } else if (baseRoute === '' || tabRoutes.includes(baseRoute)) {
                                  router.push(`/(tabs)/${route}` as any);
                                } else {
                                  router.push(`/${route}` as any);
                                }
                              }
                            }}
                          >
                            <Text variant="sm" weight="bold" style={{ color: '#fff', textAlign: 'center' }}>{item.targetLabel || 'Xem chi tiết'}</Text>
                            <View style={{ marginLeft: 6 }}>
                              <IconExternal size={14} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        ) : null}
                        
                        <TouchableOpacity 
                          style={[styles.markBtn, { borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}
                          onPress={() => markRead(item.id, !item.unread)}
                        >
                          <Text variant="sm" color="inkMuted" style={{ textAlign: 'center' }}>{item.unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}</Text>
                        </TouchableOpacity>
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  content: {
    padding: 16,
  },
  summaryScroll: {
    marginBottom: 20,
    flexGrow: 0,
  },
  sumStat: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  filterIconBox: {
    paddingRight: 12,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  notificationCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  iconCol: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 1,
    borderColor: '#fff',
  },
  contentCol: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  priorityCol: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
});

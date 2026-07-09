import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { IconBookmark, IconPlus, IconBell } from './icons';
import { formatInt } from '../lib/format';
import type { FollowedSubject, NotificationItem } from '../data/types';

interface Props {
  followed: FollowedSubject[];
  notifications: NotificationItem[];
}

export function FollowedRail({ followed, notifications }: Props) {
  const { theme } = useTheme();
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <View style={styles.container}>
      {/* Subjects */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <IconBookmark size={18} color={theme.ink} />
            <Text variant="lead" weight="bold" style={{ marginLeft: 8 }}>Chủ đề theo dõi</Text>
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.surface2 }]}>
            <IconPlus size={14} color={theme.ink} />
            <Text variant="sm" weight="bold" style={{ marginLeft: 4 }}>Thêm</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.list}>
          {followed.map(f => (
            <TouchableOpacity key={f.id} style={[styles.followItem, { borderColor: theme.border }]}>
              <Text style={{ flex: 1 }}>{f.label}</Text>
              <View style={[styles.tag, { backgroundColor: f.type === 'field' ? theme.primaryWeak : theme.surface2 }]}>
                <Text variant="xs" color={f.type === 'field' ? 'primary' : 'inkMuted'}>
                  {f.type === 'field' ? 'Lĩnh vực' : 'Từ khóa'}
                </Text>
              </View>
              {f.newPapers > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                  <Text variant="xs" color="surface" weight="bold">+{formatInt(f.newPapers)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { marginTop: 24 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <IconBell size={18} color={theme.ink} />
            <Text variant="lead" weight="bold" style={{ marginLeft: 8 }}>Thông báo</Text>
            {unreadCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.danger }]}>
                <Text variant="xs" color="surface" weight="bold">{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.list}>
          {notifications.map(n => (
            <TouchableOpacity key={n.id} style={[styles.notifItem, { backgroundColor: n.unread ? theme.surface2 : 'transparent' }]}>
              {n.unread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
              <View style={styles.notifBody}>
                <Text variant="sm" weight={n.unread ? 'bold' : 'normal'}>{n.paperTitle}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  Chủ đề <Text variant="xs" weight="bold" color="ink">{n.subject}</Text> · {n.when}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text variant="xs" color="inkMuted" style={{ marginTop: 12 }}>Thông báo tự động xóa sau 30 ngày.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  section: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  list: {},
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  notifItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 8,
  },
  notifBody: {
    flex: 1,
  },
});

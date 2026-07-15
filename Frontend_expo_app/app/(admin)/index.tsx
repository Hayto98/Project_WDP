import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconTelescope, IconRefresh, IconAlert, IconSearch } from '../../components/icons';
import { formatInt } from '../../lib/format';
import { adminApi } from '../../lib/api';
import type { AdminJob, DataSource, AdminUser, AuditLog, PaperReadLog } from '../../lib/api';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'jobs', label: 'Batch jobs' },
  { id: 'sources', label: 'Nguồn dữ liệu' },
  { id: 'users', label: 'Người dùng' },
  { id: 'reading', label: 'Thống kê' },
  { id: 'logs', label: 'Audit log' },
];

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const [tab, setTab] = useState('overview');

  const [stats, setStats] = useState({ totalPapers: 0, totalUsers: 0, activeJobs: 0, dataSources: 0 });
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [readingLogs, setReadingLogs] = useState<PaperReadLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    adminApi.stats().then(setStats).catch(console.error);
    adminApi.jobs().then(setJobs).catch(console.error);
    adminApi.dataSources().then(setSources).catch(console.error);
    adminApi.users().then(setUsers).catch(console.error);
    adminApi.paperReads().then(setReadingLogs).catch(console.error);
    adminApi.auditLogs().then(setAuditLogs).catch(console.error);
  }, []);

  const runningJobs = stats.activeJobs;
  const activeSources = stats.dataSources;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <IconTelescope color={theme.primary} size={24} />
          <View style={{ marginLeft: 8 }}>
            <Text variant="lead" weight="bold">Admin Portal</Text>
            <Text variant="xs" color="inkMuted">Xin chào, {user?.name}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <ThemeToggle />
          <TouchableOpacity onPress={logout} style={{ marginLeft: 12 }}>
            <Text variant="xs" color="danger" weight="bold">Thoát</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(t => (
            <TouchableOpacity 
              key={t.id} 
              style={[
                styles.tabBtn, 
                tab === t.id && { backgroundColor: theme.primaryWeak, borderColor: theme.primary }
              ]}
              onPress={() => setTab(t.id)}
            >
              <Text variant="sm" weight={tab === t.id ? 'bold' : 'normal'} color={tab === t.id ? 'primary' : 'inkMuted'}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'overview' && (
          <View>
            <View style={[styles.sumGrid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sumStat}>
                <Text variant="xs" color="inkMuted">Corpus</Text>
                <Text variant="title" weight="bold">{formatInt(stats.totalPapers)}</Text>
              </View>
              <View style={styles.sumStat}>
                <Text variant="xs" color="inkMuted">Job chạy</Text>
                <Text variant="title" weight="bold">{runningJobs}</Text>
              </View>
              <View style={styles.sumStat}>
                <Text variant="xs" color="inkMuted">Nguồn bật</Text>
                <Text variant="title" weight="bold">{activeSources}</Text>
              </View>
            </View>

            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Pipeline gần đây</Text>
            {jobs.slice(0, 3).map(job => (
              <View key={job.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <Text variant="body" weight="bold">{job.name}</Text>
                  <Text variant="xs" color={job.status === 'running' ? 'primary' : 'success'}>
                    {job.status === 'running' ? 'Đang chạy' : job.status === 'success' ? 'Hoàn tất' : 'Cảnh báo'}
                  </Text>
                </View>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>{job.source} · {formatInt(job.records)} records</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'jobs' && (
          <View>
            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Tất cả Batch Jobs</Text>
            {jobs.map(job => (
              <View key={job.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <Text variant="body" weight="bold">{job.name}</Text>
                  <TouchableOpacity style={styles.actionBtn}>
                    <IconRefresh color={theme.ink} size={14} />
                  </TouchableOpacity>
                </View>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  {job.status} · {formatInt(job.records)} records
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'sources' && (
          <View>
            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Nguồn dữ liệu</Text>
            {sources.map(source => (
              <View key={source.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <Text variant="body" weight="bold">{source.name}</Text>
                  <Text variant="xs" color={source.enabled ? 'success' : 'danger'}>
                    {source.enabled ? 'Đang bật' : 'Tạm dừng'}
                  </Text>
                </View>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  Latency: {source.latency} · Coverage: {source.coverage}
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'users' && (
          <View>
            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Quản lý người dùng</Text>
            {users.map(u => (
              <View key={u.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <Text variant="body" weight="bold">{u.name}</Text>
                  <Text variant="xs" color={u.status === 'active' ? 'success' : 'danger'}>
                    {u.status}
                  </Text>
                </View>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  {u.email} · {u.role}
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'reading' && (
          <View>
            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Lượt đọc gần đây</Text>
            {readingLogs.slice(0, 5).map(log => (
              <View key={log.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="body" weight="bold" numberOfLines={2}>{log.paperTitle}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  {log.userName} · {log.durationMinutes} phút · {log.viewedAt}
                </Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'logs' && (
          <View>
            <Text variant="lead" weight="bold" style={styles.sectionTitle}>Audit Logs</Text>
            {auditLogs.map(log => (
              <View key={log.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <Text variant="body" weight="bold">{log.action}</Text>
                  <Text variant="xs" color="inkMuted">{log.time}</Text>
                </View>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                  {log.actor} · {log.target}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabScroll: {
    paddingHorizontal: 12,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  content: {
    padding: 16,
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
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 4,
  }
});

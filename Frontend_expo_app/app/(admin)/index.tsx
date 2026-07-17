import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconTelescope, IconRefresh, IconAlert, IconSearch, IconBell } from '../../components/icons';
import { formatInt } from '../../lib/format';
import { adminApi, feedbackApi } from '../../lib/api';
import type { AdminJob, DataSource, AdminUser, AuditLog, PaperReadLog } from '../../lib/api';
import { useRouter } from 'expo-router';

export default function AdminOverviewScreen() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState({ totalPapers: 0, totalUsers: 0, activeJobs: 0, dataSources: 0 });
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [sources, setSources] = useState<DataSource[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [readingLogs, setReadingLogs] = useState<PaperReadLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  useEffect(() => {
    if (!user?.roles?.includes('Admin')) return;
    adminApi.stats().then(setStats).catch(console.error);
    adminApi.jobs().then(setJobs).catch(console.error);
    adminApi.dataSources().then(setSources).catch(console.error);
    adminApi.users().then(setUsers).catch(console.error);
    adminApi.paperReads().then(setReadingLogs).catch(console.error);
    adminApi.auditLogs().then(setAuditLogs).catch(console.error);
    
    // Check pending feedbacks
    feedbackApi.list({ page: 1, limit: 50 }).then((res) => {
      const rows = Array.isArray(res.data) ? res.data : [];
      setPendingFeedbackCount(rows.filter((item: any) => item.status === "Pending").length);
    }).catch(console.error);
  }, [user]);

  const runningJobs = stats.activeJobs;
  const activeSources = sources.filter((source) => source.enabled).length;
  
  const storedReadLogs = readingLogs.filter((log) => log.persistStatus === "stored").length;
  const uniqueReaders = new Set(readingLogs.map((log) => log.userEmail)).size;
  
  // Calculate top read paper
  const topReadPapers = () => {
    const map = new Map<string, { paperId: string; paperTitle: string; reads: number }>();
    for (const log of readingLogs) {
      if (log.persistStatus !== "stored") continue;
      const current = map.get(log.paperId) ?? {
        paperId: log.paperId,
        paperTitle: log.paperTitle,
        reads: 0,
      };
      current.reads += 1;
      map.set(log.paperId, current);
    }
    return Array.from(map.values()).sort((a, b) => b.reads - a.reads);
  };
  const mostReadPaper = topReadPapers()[0];

  const getJobStatusColor = (status: string) => {
    if (status === 'running') return 'primary';
    if (status === 'success') return 'success';
    if (status === 'failed') return 'danger';
    return 'warning';
  };

  const getJobStatusLabel = (status: string) => {
    if (status === 'running') return 'Đang chạy';
    if (status === 'success') return 'Hoàn tất';
    if (status === 'failed') return 'Thất bại';
    if (status === 'queued') return 'Đang chờ';
    return 'Cảnh báo';
  };

  const getSourceStatusColor = (status: string) => {
    if (status === 'active') return 'success';
    if (status === 'degraded') return 'warning';
    return 'inkMuted';
  };

  const getSourceStatusLabel = (status: string) => {
    if (status === 'active') return 'Hoạt động';
    if (status === 'degraded') return 'Suy giảm';
    return 'Tạm dừng';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <IconTelescope color={theme.primary} size={24} />
          <View style={{ marginLeft: 8 }}>
            <Text variant="lead" weight="bold">Admin Portal</Text>
            <Text variant="xs" color="inkMuted">Xin chào, {user?.name ?? 'Admin'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>

          <ThemeToggle />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Top Stats */}
        <View style={[styles.sumGrid, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Bài báo trong corpus</Text>
            <Text variant="title" weight="bold" style={{ marginTop: 4 }}>{formatInt(stats.totalPapers)}</Text>
          </View>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Job đang chạy</Text>
            <Text variant="title" weight="bold" style={{ marginTop: 4 }}>{formatInt(stats.activeJobs || runningJobs)}</Text>
          </View>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Nguồn bật</Text>
            <Text variant="title" weight="bold" style={{ marginTop: 4 }}>{activeSources}/{sources.length}</Text>
          </View>
          <View style={styles.sumStat}>
            <Text variant="xs" color="inkMuted">Lượt đọc gần đây</Text>
            <Text variant="title" weight="bold" style={{ marginTop: 4 }}>{formatInt(readingLogs.length)}</Text>
          </View>
        </View>

        {/* Trạng thái pipeline */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text variant="lead" weight="bold">Trạng thái pipeline</Text>
            <Text variant="xs" color="inkMuted">Cập nhật vài phút trước</Text>
          </View>
          {jobs.slice(0, 3).map(job => (
            <View key={job.id} style={[styles.card, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">{job.name}</Text>
                  <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                    {job.source} · {job.startedAt} - import {formatInt(job.imported)}, trùng {formatInt(job.skipped)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: theme[getJobStatusColor(job.status)] }]}>
                  <Text variant="xs" color={getJobStatusColor(job.status)} weight="bold">
                    {getJobStatusLabel(job.status)}
                  </Text>
                </View>
              </View>
              {/* Progress bar simulation */}
              <View style={[styles.progressContainer, { backgroundColor: theme.border }]}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: theme[getJobStatusColor(job.status)], 
                      width: `${job.progress}%` 
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>

        {/* Sức khỏe nguồn dữ liệu */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text variant="lead" weight="bold">Sức khỏe nguồn dữ liệu</Text>
            <Text variant="xs" color="inkMuted">{activeSources} nguồn đang bật</Text>
          </View>
          {sources.map(source => (
            <View key={source.id} style={[styles.sourceRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">{source.name}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{source.lastSync}</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text variant="xs" color={getSourceStatusColor(source.status)} weight="bold">
                  {getSourceStatusLabel(source.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Audit gần đây */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text variant="lead" weight="bold">Audit gần đây</Text>
            <Text variant="xs" color="inkMuted">{auditLogs.length} sự kiện</Text>
          </View>
          {auditLogs.slice(0, 3).map(log => (
            <View key={log.id} style={[styles.auditRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.auditDot, { backgroundColor: theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">{log.action}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{log.actor} - {log.target}</Text>
              </View>
              <Text variant="xs" color="inkMuted">{log.time.split(' ')[0]}</Text>
            </View>
          ))}
        </View>

        {/* Thống kê lượt đọc */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text variant="lead" weight="bold">Thống kê lượt đọc</Text>
            <Text variant="xs" color="inkMuted">{storedReadLogs} record đã ghi database</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text variant="xs" color="inkMuted">User duy nhất</Text>
              <Text variant="title" weight="bold" style={{ marginTop: 4 }}>{formatInt(uniqueReaders)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="xs" color="inkMuted">Top paper</Text>
              <Text variant="title" weight="bold" style={{ marginTop: 4 }}>
                {mostReadPaper ? formatInt(mostReadPaper.reads) : "0"}
              </Text>
            </View>
          </View>
          
          <Text variant="xs" color="inkMuted">
            Theo dõi paper trong database đang được đọc nhiều để biết chủ đề nào đang được user quan tâm.
          </Text>
        </View>

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
  actionBtn: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  sumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    rowGap: 16,
  },
  sumStat: {
    width: '50%',
    paddingRight: 8,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
});

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { adminApi } from '../../lib/api';
import type { AdminJob } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function BatchJobsScreen() {
  const { theme } = useTheme();
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.jobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleRefreshReports = async () => {
    setRefreshing(true);
    try {
      await adminApi.refreshReports();
      await fetchJobs();
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRunJob = async (id: string) => {
    setRunningJob(id);
    try {
      await adminApi.runJob(id);
      await fetchJobs();
      Alert.alert('Thành công', 'Đã yêu cầu chạy lại job');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể chạy lại job lúc này');
    } finally {
      setRunningJob(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text variant="lead" weight="bold">Batch jobs thu thập dữ liệu</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
          </View>
        </View>
        <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>OpenAlex, Crossref, arXiv, Semantic Scholar và IEEE</Text>
        
        <TouchableOpacity 
          style={[styles.refreshBtn, { backgroundColor: theme.primary }]}
          onPress={handleRefreshReports}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text variant="sm" weight="bold" style={{ color: '#fff' }}>Refresh reports</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading && jobs.length === 0 ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          jobs.map(job => {
            const isFailed = job.status === 'failed' || job.status === 'Thất bại' || job.errorMessage;
            const progress = job.status === 'completed' ? 100 : job.progress || 0;
            const statusColor = isFailed ? (theme.danger || 'red') : theme.primary;
            const statusText = isFailed ? 'Thất bại' : (job.status === 'completed' || job.status === 'Hoàn tất') ? 'Hoàn tất' : job.status;

            return (
              <View key={job.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={[styles.iconBox, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="sync" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <Text variant="body" weight="bold">{job.name}</Text>
                    <Text variant="xs" color="inkMuted" style={{ marginTop: 2, lineHeight: 18 }}>
                      {job.source} - {job.owner} - {job.startedAt} - query: "{job.query}" - import {job.imported}, trùng {job.skipped}
                    </Text>
                    {isFailed && job.errorMessage ? (
                      <Text variant="xs" style={{ color: theme.danger || 'red', marginTop: 4 }}>
                        {job.errorMessage}
                      </Text>
                    ) : null}
                  </View>
                  
                  <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text variant="xs" color="inkMuted" style={{ marginRight: 8 }}>{job.records} records</Text>
                      <Text variant="xs" weight="bold" style={{ color: statusColor }}>{statusText}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.runBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
                      onPress={() => handleRunJob(job.id)}
                      disabled={runningJob === job.id}
                    >
                      {runningJob === job.id ? (
                        <ActivityIndicator size="small" color={theme.ink} />
                      ) : (
                        <Text variant="xs" weight="bold">Chạy lại</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: statusColor, width: `${progress}%` }]} />
                </View>
              </View>
            );
          })
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
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  content: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  runBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
    width: '60%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

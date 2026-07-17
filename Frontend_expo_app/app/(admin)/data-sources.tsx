import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell, IconRefresh } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';

import { adminApi } from '../../lib/api';
import type { DataSource } from '../../lib/api';

export default function DataSourcesScreen() {
  const { theme } = useTheme();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [checking, setChecking] = useState(false);

  const fetchSources = () => {
    adminApi.dataSources().then(setSources).catch(console.error);
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleCheckApi = async () => {
    try {
      setChecking(true);
      const nextSources = await adminApi.checkDataSources();
      setSources(nextSources);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = async (source: DataSource) => {
    try {
      const updated = await adminApi.updateDataSource(source.id, { enabled: !source.enabled });
      setSources(sources.map(s => s.id === updated.id ? updated : s));
    } catch (e) {
      console.error(e);
    }
  };

  const activeCount = sources.filter(s => s.status === 'active' || s.status === 'degraded').length;

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'success';
    if (status === 'degraded') return 'warning';
    return 'inkMuted';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active') return 'Hoạt động';
    if (status === 'degraded') return 'Suy giảm';
    return 'Tạm dừng';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text variant="lead" weight="bold">Cấu hình nguồn dữ liệu</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
          </View>
        </View>
        <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>Bật/tắt nguồn học thuật và theo dõi độ ổn định</Text>
        <TouchableOpacity 
          style={[styles.checkBtn, { backgroundColor: theme.primary }]}
          onPress={handleCheckApi}
          disabled={checking}
        >
          <IconRefresh color={theme.surface} size={16} />
          <Text variant="xs" color="surface" weight="bold" style={{ marginLeft: 6 }}>
            {checking ? 'Đang kiểm tra...' : 'Kiểm tra API nguồn'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoBanner, { backgroundColor: theme.surface, borderColor: theme.success }]}>
          <Text variant="xs" color="success" weight="bold">
            Đã kiểm tra API: {activeCount}/{sources.length} nguồn hoạt động.
          </Text>
        </View>

        <View style={styles.grid}>
          {sources.map(source => (
            <View key={source.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">{source.name}</Text>
                  <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>Đồng bộ {source.lastSync}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme[getStatusColor(source.status)] }]}>
                  <Text variant="xs" color={getStatusColor(source.status)} weight="bold">
                    {getStatusLabel(source.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Coverage</Text>
                  <Text variant="body" weight="bold" style={{ marginTop: 2 }}>{source.coverage}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Latency</Text>
                  <Text variant="body" weight="bold" style={{ marginTop: 2 }}>{source.latency}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Error</Text>
                  <Text variant="body" weight="bold" color={source.errorRate !== '0%' ? 'danger' : 'ink'} style={{ marginTop: 2 }}>
                    {source.errorRate}
                  </Text>
                </View>
              </View>

              {source.errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: theme.bg }]}>
                  <Text variant="xs" color="danger" numberOfLines={2}>{source.errorMessage}</Text>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.toggleBtn, { borderColor: theme.border }]}
                onPress={() => handleToggle(source)}
              >
                <Text variant="sm" weight="bold" color={source.enabled ? 'inkMuted' : 'primary'}>
                  {source.enabled ? 'Tạm dừng nguồn' : 'Bật nguồn'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
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
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  content: { padding: 16 },
  infoBanner: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  }
});

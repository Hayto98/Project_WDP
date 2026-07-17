import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { adminApi, AuditLog } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function AuditLogsScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.auditLogs();
      setLogs(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', 'Không tải được Audit log');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return logs;
    return logs.filter(log => 
      log.actor.toLowerCase().includes(q) || 
      log.action.toLowerCase().includes(q) || 
      log.ip.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q)
    );
  }, [logs, query]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return theme.danger || '#ef4444';
      case 'warning': return theme.warning || '#f59e0b';
      case 'info':
      default: return theme.primary || '#0d9488';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: '100%' }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text variant="lead" weight="bold">Audit log người dùng & hệ thống</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
  </View>
  </View>
  <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
          Theo dõi hành động quan trọng, IP và mức độ rủi ro
        </Text>
</View>
        
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.inkMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.ink }]}
            placeholder="Tìm actor, hành động, IP..."
            placeholderTextColor={theme.inkMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : filteredLogs.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text variant="body" color="inkMuted">Không tìm thấy audit log</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredLogs.map(log => (
              <View key={log.id} style={[styles.logCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(log.severity) }]} />
                
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                  <Text variant="sm" weight="bold">{log.action}</Text>
                  <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
                    {log.actor} · {log.target} · {log.ip}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                  <Text variant="xs" color="inkMuted">{log.time.split(' ')[0]}</Text>
                  <Text variant="xs" color="inkMuted">{log.time.split(' ')[1]}</Text>
                </View>
              </View>
            ))}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  content: { padding: 16 },
  logCard: {
    flexDirection: 'row',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

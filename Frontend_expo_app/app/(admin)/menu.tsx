import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function MenuScreen() {
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/');
      }}
    ]);
  };

  const systemItems = [
    { id: 'batch', title: 'Batch jobs', icon: 'server-outline', onPress: () => router.push('/(admin)/batch-jobs') },
    { id: 'signals', title: 'Tín hiệu hệ thống', icon: 'pulse-outline', onPress: () => router.push('/(admin)/signals') },
    { id: 'stats', title: 'Thống kê lượt đọc', icon: 'bar-chart-outline', onPress: () => router.push('/(admin)/read-stats') },
    { id: 'audit', title: 'Audit log', icon: 'list-outline', onPress: () => router.push('/(admin)/audit-logs') },
  ];

  const accountItems = [
    { id: 'profile', title: 'Tài khoản', icon: 'person-outline', onPress: () => router.push('/(admin)/profile') },
    { id: 'logout', title: 'Đăng xuất', icon: 'log-out-outline', color: '#ef4444', onPress: handleLogout },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: '100%' }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text variant="lead" weight="bold">Menu khác</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
  </View>
  </View>
  <Text variant="xs" color="inkMuted">{user?.full_name || user?.email || 'Admin'}</Text>
</View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        
        <Text variant="xs" color="inkMuted" weight="bold" style={{ marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' }}>Hệ thống</Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {systemItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.menuItem, index < systemItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon as any} size={20} color={theme.ink} style={{ marginRight: 12 }} />
              <Text variant="body" style={{ flex: 1 }}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.inkMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text variant="xs" color="inkMuted" weight="bold" style={{ marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' }}>Tài khoản</Text>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {accountItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.menuItem, index !== accountItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null]}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon as any} size={20} color={item.color || theme.ink} style={{ marginRight: 12 }} />
              <Text variant="body" weight={item.id === 'logout' ? 'bold' : 'normal'} style={{ flex: 1, color: item.color || theme.ink }}>{item.title}</Text>
              {item.id !== 'logout' && <Ionicons name="chevron-forward" size={16} color={theme.inkMuted} />}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  content: { padding: 16 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
});

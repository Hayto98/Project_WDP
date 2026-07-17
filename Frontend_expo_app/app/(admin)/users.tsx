import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { adminApi } from '../../lib/api';
import type { AdminUser } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function UsersScreen() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced filters
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minSaved, setMinSaved] = useState('');
  const [maxSaved, setMaxSaved] = useState('');
  const [activeFrom, setActiveFrom] = useState('');
  const [activeTo, setActiveTo] = useState('');

  const fetchUsers = () => {
    setSearching(true);
    adminApi.users({ 
      q: searchQuery,
      role: roleFilter,
      status: statusFilter,
      min_saved: minSaved ? Number(minSaved) : undefined,
      max_saved: maxSaved ? Number(maxSaved) : undefined,
      active_from: activeFrom,
      active_to: activeTo
    }).then(setUsers).catch(console.error).finally(() => setSearching(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleLock = async (user: AdminUser) => {
    try {
      const isLocked = user.status === 'locked';
      const updated = await adminApi.updateUser(user.id, { 
        status: isLocked ? 'Active' : 'Banned' 
      });
      setUsers(users.map(u => u.id === updated.id ? updated : u));
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'success';
    if (status === 'locked') return 'danger';
    return 'warning';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active') return 'Đang hoạt động';
    if (status === 'locked') return 'Đã khóa';
    return 'Chờ duyệt';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text variant="lead" weight="bold">Quản lý người dùng</Text>
        <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>Role Student/Admin, trạng thái tài khoản và hoạt động gần đây</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border, flex: 1, marginTop: 0 }]}>
            <Ionicons name="search" size={16} color={theme.inkMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.ink }]}
              placeholder="Tìm tên, email..."
              placeholderTextColor={theme.inkMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchUsers}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity 
            onPress={() => setShowFilters(!showFilters)} 
            style={[styles.filterBtn, { backgroundColor: showFilters ? theme.primary : theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="options" size={20} color={showFilters ? '#fff' : theme.ink} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={{ marginTop: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Role</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {['', 'Student', 'Admin'].map(r => (
                    <TouchableOpacity key={r} onPress={() => setRoleFilter(r)} style={[styles.pill, { backgroundColor: roleFilter === r ? theme.primary : theme.surface, borderColor: theme.border }]}>
                      <Text variant="xs" color={roleFilter === r ? undefined : 'ink'} style={roleFilter === r ? { color: '#fff' } : undefined}>{r || 'Tất cả'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Trạng thái</Text>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                  {['', 'Active', 'Banned'].map(s => (
                    <TouchableOpacity key={s} onPress={() => setStatusFilter(s)} style={[styles.pill, { backgroundColor: statusFilter === s ? theme.primary : theme.surface, borderColor: theme.border }]}>
                      <Text variant="xs" color={statusFilter === s ? undefined : 'ink'} style={statusFilter === s ? { color: '#fff' } : undefined}>{s === 'Active' ? 'Hoạt động' : s === 'Banned' ? 'Khóa' : 'Tất cả'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Paper lưu (Min)</Text>
                <TextInput style={[styles.filterInput, { color: theme.ink, borderColor: theme.border, backgroundColor: theme.surface }]} value={minSaved} onChangeText={setMinSaved} keyboardType="numeric" placeholder="Min" placeholderTextColor={theme.inkMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Paper lưu (Max)</Text>
                <TextInput style={[styles.filterInput, { color: theme.ink, borderColor: theme.border, backgroundColor: theme.surface }]} value={maxSaved} onChangeText={setMaxSaved} keyboardType="numeric" placeholder="Max" placeholderTextColor={theme.inkMuted} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Từ ngày (YYYY-MM-DD)</Text>
                <TextInput style={[styles.filterInput, { color: theme.ink, borderColor: theme.border, backgroundColor: theme.surface }]} value={activeFrom} onChangeText={setActiveFrom} placeholder="Năm-Tháng-Ngày" placeholderTextColor={theme.inkMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>Đến ngày</Text>
                <TextInput style={[styles.filterInput, { color: theme.ink, borderColor: theme.border, backgroundColor: theme.surface }]} value={activeTo} onChangeText={setActiveTo} placeholder="Năm-Tháng-Ngày" placeholderTextColor={theme.inkMuted} />
              </View>
            </View>

            <TouchableOpacity onPress={fetchUsers} style={[styles.applyBtn, { backgroundColor: theme.primary }]}>
              <Text variant="sm" weight="bold" style={{ color: '#fff' }}>Áp dụng lọc</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {searching ? (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.grid}>
            {users.map(u => (
            <View key={u.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              
              <View style={styles.cardTop}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: theme.primaryWeak }]}>
                  <Text variant="body" weight="bold" color="primary">{getInitials(u.name)}</Text>
                </View>
                
                {/* User Info */}
                <View style={styles.userInfo}>
                  <Text variant="body" weight="bold">{u.name}</Text>
                  <Text variant="xs" color="inkMuted">{u.email}</Text>
                </View>
                
                {/* Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme[getStatusColor(u.status)] }]}>
                  <Text variant="xs" color={getStatusColor(u.status)} weight="bold">
                    {getStatusLabel(u.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Role</Text>
                  <Text variant="body" weight="bold" style={{ marginTop: 2 }}>{u.role}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Hoạt động</Text>
                  <Text variant="xs" weight="bold" style={{ marginTop: 2 }}>{u.lastActive}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text variant="xs" color="inkMuted">Paper lưu</Text>
                  <Text variant="body" weight="bold" style={{ marginTop: 2 }}>{u.savedPapers}</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.toggleBtn, { borderColor: theme.border }]}
                onPress={() => handleToggleLock(u)}
              >
                <Text variant="sm" weight="bold" color={u.status === 'locked' ? 'primary' : 'inkMuted'}>
                  {u.status === 'locked' ? 'Mở khóa' : 'Khóa'}
                </Text>
              </TouchableOpacity>
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
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  filterInput: {
    height: 36,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  applyBtn: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  content: { padding: 16 },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
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
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  }
});

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, TextInput } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.41:5000/api/v1';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  status: string;
  roles: string[];
  created_at?: string;
  updated_at?: string;
  saved_searches?: any[];
  followed_subjects?: any[];
  dashboard_layout?: { widgets: string[] };
}

function initials(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN');
  } catch {
    return dateStr;
  }
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@accessToken');
      if (!token) throw new Error('Không tìm thấy token đăng nhập');

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi lấy thông tin');

      setProfile(data.data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e.message || 'Không thể lấy thông tin tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }}
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setChangingPassword(true);
    try {
      const token = await AsyncStorage.getItem('@accessToken');
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi đổi mật khẩu');

      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  const InfoRow = ({ icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color={theme.inkMuted} style={{ marginRight: 12 }} />
        <Text variant="sm" color="inkMuted">{label}</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text variant="sm" weight="bold" style={{ textAlign: 'right' }}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={24} color={theme.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="lead" weight="bold">Tài khoản Admin</Text>
          <Text variant="xs" color="inkMuted">Thông tin chi tiết hồ sơ</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : profile ? (
          <View style={{ gap: 24 }}>
            {/* Avatar & Header */}
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text variant="heading" style={{ color: '#fff' }}>{initials(profile.full_name)}</Text>
              </View>
              <Text variant="title" weight="bold" style={{ marginTop: 16 }}>{profile.full_name}</Text>
              <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>{profile.email}</Text>
              
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={[styles.badge, { backgroundColor: theme.primaryWeak }]}>
                  <Text variant="xs" weight="bold" style={{ color: theme.primaryInk }}>{profile.roles?.join(', ') || 'N/A'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: profile.status === 'Active' ? '#10b98120' : '#ef444420' }]}>
                  <Text variant="xs" weight="bold" style={{ color: profile.status === 'Active' ? '#10b981' : '#ef4444' }}>
                    {profile.status}
                  </Text>
                </View>
              </View>
            </View>

            {/* General Info */}
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text variant="sm" weight="bold">Thông tin chung</Text>
              </View>
              <InfoRow icon="mail-outline" label="Email" value={profile.email} />
              <InfoRow icon="shield-checkmark-outline" label="Phân quyền" value={profile.roles?.join(', ') || ''} />
              <InfoRow icon="time-outline" label="Ngày tạo tài khoản" value={formatDate(profile.created_at)} />
              <InfoRow icon="sync-outline" label="Cập nhật lần cuối" value={formatDate(profile.updated_at)} />
            </View>

            {/* Preferences / Activity */}
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text variant="sm" weight="bold">Dữ liệu cá nhân (Preferences)</Text>
              </View>
              <InfoRow 
                icon="search-outline" 
                label="Tìm kiếm đã lưu" 
                value={`${profile.saved_searches?.length || 0} mục`} 
              />
              <InfoRow 
                icon="bookmark-outline" 
                label="Chủ đề theo dõi" 
                value={`${profile.followed_subjects?.length || 0} chủ đề`} 
              />
              <InfoRow 
                icon="grid-outline" 
                label="Widget Dashboard" 
                value={`${profile.dashboard_layout?.widgets?.length || 0} widget`} 
              />
            </View>

            {/* Actions */}
            <View style={{ gap: 12 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: theme.border }]} 
                onPress={() => setShowPasswordModal(true)}
              >
                <Ionicons name="key-outline" size={20} color={theme.ink} style={{ marginRight: 8 }} />
                <Text variant="sm" weight="bold">Đổi mật khẩu</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { borderColor: theme.danger || '#ef4444' }]} 
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color={theme.danger || '#ef4444'} style={{ marginRight: 8 }} />
                <Text variant="sm" weight="bold" style={{ color: theme.danger || '#ef4444' }}>Đăng xuất</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text variant="body" color="inkMuted">Không tải được thông tin.</Text>
          </View>
        )}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text variant="title" weight="bold" style={{ marginBottom: 16 }}>Đổi mật khẩu</Text>
            
            <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Mật khẩu hiện tại</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại"
              placeholderTextColor={theme.inkMuted}
            />

            <Text variant="sm" weight="bold" style={{ marginTop: 12, marginBottom: 8 }}>Mật khẩu mới</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              placeholderTextColor={theme.inkMuted}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: theme.surface2, flex: 1 }]} 
                onPress={() => setShowPasswordModal(false)}
                disabled={changingPassword}
              >
                <Text variant="sm" weight="bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: theme.primary, flex: 1 }]} 
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text variant="sm" weight="bold" style={{ color: '#fff' }}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  content: { padding: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  section: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalBtn: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconGap, IconBookmark, IconLibrary, IconTelescope, IconUser } from '../../components/icons';

const MENU_ITEMS = [
  { id: 'workspace', title: 'Workspace', icon: IconLibrary, href: '/(tabs)/workspace' },
  { id: 'follow', title: 'Theo dõi', icon: IconBookmark, href: '/(tabs)/follow' },
  { id: 'gap', title: 'Research Gap', icon: IconGap, href: '/(tabs)/gap' },
];

export default function MenuTab() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const userName = user?.full_name || user?.name || '';

  const handleLogout = async () => {
    await logout();
    // the layout will auto-redirect
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="heading" weight="bold">Menu</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text variant="lead" weight="bold" style={{ color: theme.surface }}>
              {userName.substring(0, 2).toUpperCase() || 'US'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text variant="lead" weight="bold">{userName}</Text>
            <Text variant="sm" color="inkMuted">{user?.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="xs" weight="bold" color="inkMuted" style={styles.sectionTitle}>TÍNH NĂNG</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {MENU_ITEMS.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.menuItem, 
                  index < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }
                ]}
                onPress={() => router.push(item.href as any)}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.surface2 }]}>
                  <item.icon color={theme.primary} size={18} />
                </View>
                <Text style={{ flex: 1, marginLeft: 12 }}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="xs" weight="bold" color="inkMuted" style={styles.sectionTitle}>TÀI KHOẢN</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              onPress={() => router.push('/(tabs)/account')}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.surface2 }]}>
                <IconUser color={theme.primary} size={18} />
              </View>
              <Text style={{ flex: 1, marginLeft: 12 }}>Tài khoản</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={[styles.iconBox, { backgroundColor: theme.danger + '20' }]}>
                <IconTelescope color={theme.danger} size={18} />
              </View>
              <Text style={{ flex: 1, marginLeft: 12 }} color="danger">Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

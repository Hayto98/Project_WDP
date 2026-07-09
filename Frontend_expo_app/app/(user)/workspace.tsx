import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconSearch } from '../../components/icons';

export default function WorkspaceScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Không gian làm việc chung</Text>
        <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
          Thảo luận, chia sẻ tài liệu và hợp tác cùng đồng nghiệp
        </Text>
      </View>

      <View style={[styles.emptyState, { backgroundColor: theme.surface2 }]}>
        <IconSearch color={theme.primary} size={32} />
        <Text variant="title" weight="bold" style={{ marginTop: 16, marginBottom: 8 }}>Chưa có workspace nào</Text>
        <Text variant="sm" color="inkMuted" style={{ textAlign: 'center', paddingHorizontal: 24 }}>
          Hãy tạo không gian làm việc mới để bắt đầu hợp tác.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    marginTop: 16,
  },
});

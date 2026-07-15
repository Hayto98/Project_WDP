import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { FollowedRail } from '../../components/FollowedRail';
import { dashboardApi } from '../../lib/api';
import type { DashboardData } from '../../data/types';

export default function FollowScreen() {
  const { theme } = useTheme();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    dashboardApi.overview().then(setData).catch(console.error);
  }, []);

  if (!data) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Không gian theo dõi</Text>
        <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
          Cập nhật thông báo về các chủ đề, lĩnh vực bạn quan tâm
        </Text>
      </View>

      <FollowedRail followed={data.followed} notifications={data.notifications} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 24 },
});

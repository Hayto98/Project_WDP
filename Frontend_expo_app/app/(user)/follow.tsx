import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { FollowedRail } from '../../components/FollowedRail';
import { makeDashboardData } from '../../data/sample';

export default function FollowScreen() {
  const { theme } = useTheme();
  const data = makeDashboardData('12m');

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

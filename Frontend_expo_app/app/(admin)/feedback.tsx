import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { feedbackApi } from '../../lib/api';
import { formatWhen } from '../../lib/api';

export default function FeedbackScreen() {
  const { theme } = useTheme();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  useEffect(() => {
    feedbackApi.list({ page: 1, limit: 50 })
      .then((res) => {
        setFeedbacks(Array.isArray(res.data) ? res.data : []);
      })
      .catch(console.error);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'Pending') return 'warning';
    if (status === 'Reviewed') return 'primary';
    return 'success';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text variant="lead" weight="bold">Phản hồi</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {feedbacks.map(f => {
          const userEmail = f.user_id?.email || 'Khách';
          const time = f.created_at || f.updated_at;
          return (
            <View key={f._id || f.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <Text variant="body" weight="bold">{userEmail}</Text>
                <Text variant="xs" color={getStatusColor(f.status)}>
                  {f.status === 'Pending' ? 'Đang chờ' : f.status === 'Reviewed' ? 'Đã xem' : 'Đã xử lý'}
                </Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }} numberOfLines={3}>{f.content}</Text>
              <Text variant="xs" color="inkMuted" style={{ marginTop: 8 }}>
                {time ? formatWhen(time) : 'Không rõ thời gian'}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

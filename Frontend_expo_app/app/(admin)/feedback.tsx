import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { feedbackApi, formatWhen } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function FeedbackScreen() {
  const { theme } = useTheme();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchList = () => {
    feedbackApi.list({ page: 1, limit: 50 })
      .then((res) => setFeedbacks(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const loadDetail = async (id: string) => {
    setLoading(true);
    try {
      const res = await feedbackApi.getById(id) as any;
      setSelectedFeedback(res.data || res); // Depending on response envelope
      if (res.data?.status === 'Pending' || res?.status === 'Pending') {
        // Automatically mark as Reviewed if it was Pending
        await feedbackApi.update(id, { status: 'Reviewed' });
        fetchList();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (f: any) => {
    const id = f._id || f.id;
    loadDetail(id);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedFeedback) return;
    setUpdating(true);
    const id = selectedFeedback._id || selectedFeedback.id;
    try {
      await feedbackApi.reply(id, replyText);
      setReplyText('');
      await loadDetail(id);
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangeStatus = async (status: "Pending" | "Reviewed" | "Resolved") => {
    if (!selectedFeedback) return;
    setUpdating(true);
    const id = selectedFeedback._id || selectedFeedback.id;
    try {
      await feedbackApi.update(id, { status });
      await loadDetail(id);
      fetchList();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Pending') return 'warning';
    if (status === 'Reviewed') return 'primary';
    return 'success';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Pending') return 'Đang chờ';
    if (status === 'Reviewed') return 'Đã xem';
    return 'Đã xử lý';
  };

  if (selectedFeedback) {
    const messages = selectedFeedback.messages || [];
    const time = selectedFeedback.created_at || selectedFeedback.updated_at;
    const userName = selectedFeedback.user_id?.full_name || selectedFeedback.user_id?.email || 'Khách';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => setSelectedFeedback(null)} style={{ marginRight: 16 }}>
            <Ionicons name="arrow-back" size={24} color={theme.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="bold">{userName}</Text>
            <Text variant="xs" color="inkMuted">{time ? formatWhen(time) : ''}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.statusBadge, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => {
               // Cycle status: Pending -> Reviewed -> Resolved -> Reviewed
               let next: "Pending"| "Reviewed"| "Resolved" = "Reviewed";
               if (selectedFeedback.status === 'Reviewed') next = 'Resolved';
               handleChangeStatus(next);
            }}
          >
            <Text variant="xs" weight="bold" color={getStatusColor(selectedFeedback.status)}>
              {getStatusLabel(selectedFeedback.status)} {updating && '...'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.chatContent}>
            {/* Original feedback as first message */}
            <View style={[styles.messageBubble, styles.messageLeft, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>{userName}</Text>
              <Text variant="body">{selectedFeedback.content}</Text>
              <Text variant="xs" color="inkMuted" style={{ marginTop: 4, alignSelf: 'flex-end' }}>{time ? formatWhen(time) : ''}</Text>
            </View>

            {messages.map((m: any, idx: number) => {
              const isAdmin = m.sender === 'Admin';
              return (
                <View 
                  key={m._id || idx} 
                  style={[
                    styles.messageBubble, 
                    isAdmin ? styles.messageRight : styles.messageLeft,
                    { backgroundColor: isAdmin ? theme.primary + '20' : theme.surface, borderColor: isAdmin ? 'transparent' : theme.border }
                  ]}
                >
                  <Text variant="xs" color="inkMuted" style={{ marginBottom: 4 }}>{isAdmin ? 'Bạn (Admin)' : userName}</Text>
                  <Text variant="body" color={isAdmin ? 'primary' : 'ink'}>{m.content}</Text>
                  <Text variant="xs" color="inkMuted" style={{ marginTop: 4, alignSelf: 'flex-end' }}>
                    {m.created_at ? formatWhen(m.created_at) : ''}
                  </Text>
                </View>
              );
            })}
            
            {loading && !messages.length && <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />}
          </ScrollView>

          <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
            <TextInput
              style={[styles.input, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.border }]}
              placeholder="Nhập tin nhắn phản hồi..."
              placeholderTextColor={theme.inkMuted}
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: (!replyText.trim() || updating) ? 0.5 : 1 }]} 
              onPress={handleReply}
              disabled={!replyText.trim() || updating}
            >
              <Ionicons name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: '100%' }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text variant="lead" weight="bold">Hộp chat phản hồi</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
  </View>
  </View>
  <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{feedbacks.length} hội thoại</Text>
</View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {feedbacks.map(f => {
          const userName = f.user_id?.full_name || f.user_id?.email || 'Khách';
          const time = f.created_at || f.updated_at;
          const isPending = f.status === 'Pending';
          
          return (
            <TouchableOpacity 
              key={f._id || f.id} 
              style={[styles.card, { backgroundColor: isPending ? theme.primary + '10' : theme.surface, borderColor: theme.border }]}
              onPress={() => handleSelect(f)}
            >
              <View style={styles.cardHeader}>
                <Text variant="body" weight="bold">{userName}</Text>
                <Text variant="xs" color="inkMuted">
                  {time ? formatWhen(time) : ''}
                </Text>
              </View>
              <Text variant="body" style={{ marginTop: 8 }} numberOfLines={2}>{f.content}</Text>
              <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                <Text variant="xs" weight="bold" color={getStatusColor(f.status)}>
                  {getStatusLabel(f.status)}
                </Text>
              </View>
            </TouchableOpacity>
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 32,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: '85%',
    borderWidth: 1,
  },
  messageLeft: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageRight: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

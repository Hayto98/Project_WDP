import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../Text';
import { type CollaborationInvite } from '../../lib/api';
import { workspaceApi } from '../../lib/api';

export function WorkspaceInvites({ invites, activeWorkspaceId, onRefresh, refreshing = false }: { invites: CollaborationInvite[], activeWorkspaceId: string, onRefresh: () => void, refreshing?: boolean }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendInvite = async () => {
    if (!email.trim() || !activeWorkspaceId) return;
    setLoading(true);
    try {
      await workspaceApi.createInvite({
        workspaceId: activeWorkspaceId,
        inviteeEmail: email.trim().toLowerCase(),
        topic: topic.trim() || "Cùng nghiên cứu",
        message: message.trim()
      });
      Alert.alert("Thành công", "Đã gửi lời mời!");
      setEmail("");
      setTopic("");
      setMessage("");
      onRefresh();
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể gửi lời mời. Vui lòng kiểm tra lại email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
      }
    >
      <View style={[styles.inviteBox, { backgroundColor: theme.surface }]}>
        <Text variant="title" weight="bold" style={{ marginBottom: 4 }}>Gửi email mời cộng tác</Text>
        <Text variant="sm" color="inkMuted" style={{ marginBottom: 24, lineHeight: 20 }}>
          Theo dõi email đang chờ xác nhận, đã chấp nhận và đã từ chối trong cùng một màn quản lý workspace.
        </Text>

        <Text variant="sm" weight="bold" style={styles.label}>Email người muốn hợp tác</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]} 
          placeholder="ngoc.vu@hust.edu.vn"
          placeholderTextColor={theme.inkMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text variant="sm" weight="bold" style={styles.label}>Chủ đề muốn nghiên cứu chung</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]} 
          placeholder="Ví dụ: Đồng viết survey về biomedical RAG"
          placeholderTextColor={theme.inkMuted}
          value={topic}
          onChangeText={setTopic}
        />

        <Text variant="sm" weight="bold" style={styles.label}>Nội dung gửi trong email</Text>
        <TextInput 
          style={[styles.input, styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]} 
          placeholder="Ví dụ: Mình đang tổng hợp paper nền và muốn mời bạn cùng đọc, ghi chú và phân tích hướng nghiên cứu."
          placeholderTextColor={theme.inkMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text variant="xs" color="inkMuted" style={{ marginBottom: 16 }}>
          Đây là chức năng cấp workspace: email chứa chủ đề, nội dung lời mời và link xác nhận tham gia workspace.
        </Text>

        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} onPress={handleSendInvite} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.surface} size="small" />
          ) : (
            <Text weight="bold" color="surface" style={{ textAlign: 'center' }}>+ Gửi email mời</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text variant="title" weight="bold" style={{ marginTop: 24, marginBottom: 16 }}>Đang chờ xác nhận</Text>
      
      {invites.map(invite => (
        <View key={invite.id} style={[styles.inviteRow, { backgroundColor: theme.surface }]}>
          <View style={styles.info}>
            <Text weight="bold">{invite.inviteeName || invite.inviteeEmail}</Text>
            {invite.inviteeName && <Text variant="xs" color="inkMuted">{invite.inviteeEmail}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: theme.surface2 }]}>
            <Text variant="xs" color="inkMuted">{invite.status === 'pending' ? 'Đang chờ' : invite.status}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  inviteBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  btn: {
    padding: 14,
    borderRadius: 8,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  info: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  }
});

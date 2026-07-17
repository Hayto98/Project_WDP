import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { Widget } from '../../components/Widget';
import { IconArrowLeft, IconSend, IconBell } from '../../components/icons';
import { ThemeToggle } from '../../components/ThemeToggle';
import { userApi, authApi, feedbackApi, notificationApi } from '../../lib/api';

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme: activeTheme } = useTheme();

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.full_name || user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profileNotice, setProfileNotice] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadFeedbacks();
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const items = await notificationApi.list();
      setUnreadCount(items.filter(n => n.unread).length);
    } catch(e) {}
  };

  const loadFeedbacks = async () => {
    setFeedbackNotice("");
    try {
      const result = await feedbackApi.list({ page: 1, limit: 20 });
      const rows = Array.isArray(result.data) ? result.data : [];
      setFeedbacks(rows);
      if (rows.length > 0 && !selectedFeedbackId) {
        setSelectedFeedbackId(rows[0]._id || rows[0].id);
      }
    } catch (err: any) {
      setFeedbackNotice(err.message || "Không tải được phản hồi.");
    }
  };

  const submitProfile = async () => {
    setProfileNotice("");
    setProfileBusy(true);
    try {
      await userApi.updateProfile({
        full_name: profileName.trim(),
        email: profileEmail.trim(),
      });
      setProfileNotice("Đã cập nhật thông tin tài khoản.");
    } catch (err: any) {
      setProfileNotice(err.message || "Không cập nhật được tài khoản.");
    } finally {
      setProfileBusy(false);
    }
  };

  const submitPassword = async () => {
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordNotice("Mật khẩu mới chưa khớp.");
      return;
    }
    setPasswordBusy(true);
    try {
      const result = await authApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice(result.message || "Đã đổi mật khẩu.");
    } catch (err: any) {
      setPasswordNotice(err.message || "Không đổi được mật khẩu.");
    } finally {
      setPasswordBusy(false);
    }
  };

  const submitFeedback = async () => {
    const content = feedbackContent.trim();
    if (!content) return;
    setFeedbackBusy(true);
    setFeedbackNotice("");
    try {
      const created: any = await feedbackApi.create(content);
      setFeedbackContent("");
      setFeedbacks(curr => [created, ...curr]);
      setSelectedFeedbackId(created._id || created.id);
      setFeedbackNotice("Đã gửi tin nhắn cho admin.");
    } catch (err: any) {
      setFeedbackNotice(err.message || "Không gửi được phản hồi.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const replyInThread = async () => {
    if (!selectedFeedbackId) return;
    const content = replyContent.trim();
    if (!content) return;
    setFeedbackBusy(true);
    setFeedbackNotice("");
    try {
      const updated = await feedbackApi.reply(selectedFeedbackId, content);
      setReplyContent("");
      setFeedbacks(curr => curr.map(item => ((item._id || item.id) === selectedFeedbackId ? updated : item)));
      setFeedbackNotice("Đã gửi tin nhắn tiếp theo.");
    } catch (err: any) {
      setFeedbackNotice(err.message || "Không gửi được tin nhắn.");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const selectedFeedback = feedbacks.find(item => (item._id || item.id) === selectedFeedbackId);
  const messages = selectedFeedback?.messages || [];
  if (messages.length === 0 && selectedFeedback?.content) {
    messages.push({
      sender_role: "User",
      sender_name: "Bạn",
      content: selectedFeedback.content,
      created_at: selectedFeedback.created_at,
    });
    if (selectedFeedback.admin_note) {
      messages.push({
        sender_role: "Admin",
        sender_name: "Admin",
        content: selectedFeedback.admin_note,
        created_at: selectedFeedback.updated_at,
      });
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconArrowLeft color={activeTheme.ink} size={24} />
        </TouchableOpacity>
        <Text variant="heading" weight="bold" style={{ flex: 1 }}>Tài khoản</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')} style={{ position: 'relative' }}>
            <IconBell color={activeTheme.ink} size={20} />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: -5, right: -5, backgroundColor: activeTheme.danger,
                borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
                paddingHorizontal: 4, borderWidth: 1, borderColor: activeTheme.bg
              }}>
                <Text variant="xs" weight="bold" style={{ color: '#fff', fontSize: 10, lineHeight: 12, textAlign: 'center' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <ThemeToggle />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* PROFILE INFO */}
        <Widget title="Thông tin tài khoản" subtitle={user?.email || ""} status="ready">
          
          <View style={[styles.formGroup, styles.row, { justifyContent: 'space-between' }]}>
            <Text variant="sm" weight="bold" color="inkMuted">Vai trò</Text>
            <Text variant="sm" weight="bold">{user?.roles?.includes('Admin') ? 'Admin' : 'Student'}</Text>
          </View>
          <View style={[styles.formGroup, styles.row, { justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: activeTheme.border }]}>
            <Text variant="sm" weight="bold" color="inkMuted">Trạng thái</Text>
            <Text variant="sm" weight="bold">Active</Text>
          </View>

          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Họ tên</Text>
            <TextInput
              style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface }]}
              value={profileName}
              onChangeText={setProfileName}
            />
          </View>
          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Email</Text>
            <TextInput
              style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface2 }]}
              value={profileEmail}
              editable={false}
            />
          </View>
          {profileNotice ? <Text variant="sm" color="primary" style={{ marginBottom: 12 }}>{profileNotice}</Text> : null}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: activeTheme.primary }]} 
            onPress={submitProfile}
            disabled={profileBusy}
          >
            {profileBusy ? <ActivityIndicator color={activeTheme.surface} size="small" /> : <Text variant="body" weight="bold" color="surface">Lưu thông tin</Text>}
          </TouchableOpacity>
        </Widget>

        {/* CHANGE PASSWORD */}
        <Widget title="Đổi mật khẩu" subtitle="Yêu cầu nhập mật khẩu hiện tại trước khi cập nhật" status="ready">
          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Mật khẩu hiện tại</Text>
            <TextInput
              style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Mật khẩu mới</Text>
            <TextInput
              style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface }]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
          </View>
          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Nhập lại mật khẩu mới</Text>
            <TextInput
              style={[styles.input, { borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
          {passwordNotice ? <Text variant="sm" color="danger" style={{ marginBottom: 12 }}>{passwordNotice}</Text> : null}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: activeTheme.primary }]} 
            onPress={submitPassword}
            disabled={passwordBusy}
          >
            {passwordBusy ? <ActivityIndicator color={activeTheme.surface} size="small" /> : <Text variant="body" weight="bold" color="surface">Cập nhật mật khẩu</Text>}
          </TouchableOpacity>
        </Widget>

        {/* FEEDBACK CHAT */}
        <Widget title="Chat phản hồi với Admin" subtitle="Gửi góp ý và xem lại toàn bộ lịch sử hội thoại" status="ready">
          
          <View style={styles.formGroup}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Tạo cuộc hội thoại mới</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface }]}
                placeholder="Nhập tin nhắn gửi admin..."
                placeholderTextColor={activeTheme.inkMuted}
                value={feedbackContent}
                onChangeText={setFeedbackContent}
              />
              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: activeTheme.primary, marginLeft: 8 }]}
                onPress={submitFeedback}
                disabled={feedbackBusy}
              >
                {feedbackBusy ? <ActivityIndicator color={activeTheme.surface} size="small" /> : <IconSend color={activeTheme.surface} size={20} />}
              </TouchableOpacity>
            </View>
            {feedbackNotice ? <Text variant="sm" color="primary" style={{ marginTop: 8 }}>{feedbackNotice}</Text> : null}
          </View>

          {feedbacks.length > 0 && (
            <View style={styles.chatSection}>
              {/* Threads Horizontal List */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {feedbacks.map((fb, idx) => {
                  const id = fb._id || fb.id;
                  const isSelected = selectedFeedbackId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.threadChip, 
                        { borderColor: activeTheme.border, backgroundColor: activeTheme.surface2 },
                        isSelected && { borderColor: activeTheme.primary, backgroundColor: activeTheme.primary.replace('hsl(', 'hsla(').replace(')', ', 0.15)') }
                      ]}
                      onPress={() => setSelectedFeedbackId(id)}
                    >
                      <Text variant="xs" weight={isSelected ? "bold" : "normal"} color={isSelected ? "primary" : "inkMuted"}>
                        Hội thoại {feedbacks.length - idx}
                      </Text>
                      <Text variant="xs" color={fb.status === 'Resolved' ? "success" : fb.status === 'Reviewed' ? "primary" : "warning"} style={{ marginTop: 2 }}>
                        {fb.status === 'Resolved' ? "Đã xử lý" : fb.status === 'Reviewed' ? "Đã xem" : "Đang chờ"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Chat Thread */}
              {selectedFeedback && (
                <View style={[styles.chatBox, { borderColor: activeTheme.border, backgroundColor: activeTheme.surface2 }]}>
                  {messages.map((msg: any, i: number) => {
                    const isAdmin = msg.sender_role === 'Admin';
                    const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <View key={i} style={[styles.msgWrapper, isAdmin ? styles.msgAdminWrapper : styles.msgUserWrapper]}>
                        <View style={{ flexShrink: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, justifyContent: isAdmin ? 'flex-start' : 'flex-end', paddingHorizontal: 4 }}>
                            <Text variant="xs" weight="bold" color="inkMuted">{msg.sender_name || (isAdmin ? 'Admin' : 'Bạn')}</Text>
                            {timeStr ? <Text variant="xs" color="inkMuted" style={{ fontSize: 10 }}>{timeStr}</Text> : null}
                          </View>
                          <View style={[
                            styles.msgBubble, 
                            isAdmin 
                              ? { backgroundColor: activeTheme.surface, borderColor: activeTheme.border, borderWidth: 1, borderTopLeftRadius: 4 } 
                              : { backgroundColor: activeTheme.primary, borderTopRightRadius: 4 }
                          ]}>
                            <Text variant="sm" color={isAdmin ? 'ink' : 'surface'}>{msg.content}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  
                  {/* Reply Input */}
                  <View style={[styles.row, { marginTop: 12 }]}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: activeTheme.border, color: activeTheme.ink, backgroundColor: activeTheme.surface, height: 40, paddingVertical: 8, borderRadius: 20, paddingHorizontal: 16 }]}
                      placeholder="Viết phản hồi..."
                      placeholderTextColor={activeTheme.inkMuted}
                      value={replyContent}
                      onChangeText={setReplyContent}
                    />
                    <TouchableOpacity 
                      style={[styles.sendBtn, { backgroundColor: activeTheme.primary, marginLeft: 8, width: 40, height: 40, borderRadius: 20, paddingHorizontal: 0 }]}
                      onPress={replyInThread}
                      disabled={feedbackBusy}
                    >
                      <IconSend color={activeTheme.surface} size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

        </Widget>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  scroll: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sendBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  chatSection: {
    marginTop: 8,
  },
  threadChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 100,
  },
  chatBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  msgWrapper: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  msgAdminWrapper: {
    justifyContent: 'flex-start',
    paddingRight: 40,
  },
  msgUserWrapper: {
    justifyContent: 'flex-end',
    paddingLeft: 40,
  },
  msgBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  }
});

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { adminApi } from '../../lib/api';
import { Ionicons } from '@expo/vector-icons';

export default function SystemSignalsScreen() {
  const { theme } = useTheme();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<"high" | "normal" | "low">('high');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Tiêu đề và Nội dung.');
      return;
    }
    
    setSending(true);
    try {
      const res = await adminApi.broadcastNotification({
        title: title.trim(),
        content: content.trim(),
        priority,
      });
      Alert.alert('Thành công', res.message || `Đã gửi tín hiệu tới ${res.sent} người dùng.`);
      setTitle('');
      setContent('');
      setPriority('high');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e.message || 'Không gửi được tín hiệu hệ thống.');
    } finally {
      setSending(false);
    }
  };

  const priorityOptions = [
    { value: 'high', label: 'Ưu tiên cao' },
    { value: 'normal', label: 'Ưu tiên trung bình' },
    { value: 'low', label: 'Ưu tiên thấp' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={{ width: '100%' }}>
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <View style={{ flex: 1, paddingRight: 16 }}>
      <Text variant="lead" weight="bold">Gửi tín hiệu hệ thống</Text>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
<ThemeToggle />
  </View>
  </View>
  <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
          Thông báo bảo trì, sự cố hoặc chính sách tới toàn bộ người dùng đang hoạt động
        </Text>
</View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.formGroup}>
            <Text variant="body" weight="bold" style={{ marginBottom: 8 }}>Tiêu đề</Text>
            <TextInput
              style={[styles.input, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.border }]}
              placeholder="Ví dụ: Bảo trì hệ thống 22:00-23:00"
              placeholderTextColor={theme.inkMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text variant="body" weight="bold" style={{ marginBottom: 8 }}>Nội dung</Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: theme.ink, backgroundColor: theme.surface, borderColor: theme.border }]}
              placeholder="Mô tả ngắn cho người dùng: thời gian, ảnh hưởng, hành động cần làm..."
              placeholderTextColor={theme.inkMuted}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text variant="body" weight="bold" style={{ marginBottom: 8 }}>Mức ưu tiên</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {priorityOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.priorityPill,
                    { 
                      backgroundColor: priority === opt.value ? theme.primary : theme.surface,
                      borderColor: priority === opt.value ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => setPriority(opt.value as any)}
                >
                  <Text 
                    variant="xs" 
                    weight={priority === opt.value ? 'bold' : 'normal'}
                    style={{ color: priority === opt.value ? '#fff' : theme.ink }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.submitBtn, 
              { backgroundColor: theme.primary, opacity: sending ? 0.7 : 1 }
            ]}
            onPress={handleSend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text variant="body" weight="bold" style={{ color: '#fff' }}>Gửi tới tất cả người dùng</Text>
            )}
          </TouchableOpacity>

          <Text variant="xs" color="inkMuted" style={{ marginTop: 12 }}>
            Tín hiệu xuất hiện trong Hộp thư của user. Log import bài báo không còn gửi vào hộp thư.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
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
  content: { padding: 16 },
  formGroup: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    minHeight: 120,
  },
  priorityPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  submitBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  }
});

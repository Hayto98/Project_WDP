import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconArrowLeft } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { theme } = useTheme();
  const router = useRouter();
  const { registerUser } = useAuth();

  const handleRegister = async () => {
    try {
      setErrorMsg('');
      if (!name || !email || !password) {
        setErrorMsg('Vui lòng nhập đầy đủ thông tin');
        return;
      }
      await registerUser(email, password, name);
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      router.back();
    } catch (e: any) {
      setErrorMsg(e.message || 'Đăng ký thất bại');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconArrowLeft color={theme.ink} size={24} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text variant="heading" weight="bold" style={styles.title}>Tạo tài khoản</Text>
            <Text variant="sm" color="inkMuted">Bắt đầu theo dõi các xu hướng nghiên cứu mới nhất.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text variant="sm" weight="bold" style={styles.label}>Họ và tên</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={theme.inkMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="sm" weight="bold" style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                placeholder="Nhập email của bạn"
                placeholderTextColor={theme.inkMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text variant="sm" weight="bold" style={styles.label}>Mật khẩu</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                placeholder="Tạo mật khẩu"
                placeholderTextColor={theme.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.primary, marginTop: 12 }]}
              onPress={handleRegister}
            >
              <Text variant="body" weight="bold" style={{ color: theme.surface }}>Đăng ký</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text variant="sm" color="inkMuted">Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text variant="sm" weight="bold" color="primary">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
  },
  backBtn: {
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    marginBottom: 8,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
});

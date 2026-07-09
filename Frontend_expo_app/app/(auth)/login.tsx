import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconTelescope, IconArrowRight } from '../../components/icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleLogin = async (role: 'admin' | 'student') => {
    // In a real app, this would validate credentials
    await login(role);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: theme.primary }]}>
              <IconTelescope color={theme.surface} size={32} />
            </View>
            <Text variant="heading" weight="bold" style={styles.title}>ResearchTrends</Text>
            <Text variant="sm" color="inkMuted">Khám phá tri thức học thuật</Text>
          </View>

          <View style={styles.form}>
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
                placeholder="Nhập mật khẩu"
                placeholderTextColor={theme.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.demoButtons}>
              <Text variant="xs" color="inkMuted" style={{ textAlign: 'center', marginBottom: 12 }}>
                Đăng nhập nhanh để trải nghiệm (Demo)
              </Text>
              
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: theme.primary }]}
                onPress={() => handleLogin('student')}
              >
                <Text variant="body" weight="bold" style={{ color: theme.surface }}>Đăng nhập User</Text>
                <IconArrowRight color={theme.surface} size={18} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, styles.btnOutline, { borderColor: theme.border }]}
                onPress={() => handleLogin('admin')}
              >
                <Text variant="body" weight="bold" color="ink">Đăng nhập Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text variant="sm" color="inkMuted">Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text variant="sm" weight="bold" color="primary">Đăng ký ngay</Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    marginBottom: 4,
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
  demoButtons: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 24,
  },
  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  btnOutline: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
});

import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { themeType } = useTheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if unauthenticated
      router.replace('/(auth)/login' as any);
    } else if (user) {
      // Redirect to correct dashboard based on role
      const role = user.roles?.includes('Admin') ? 'admin' : 'student';
      if (role === 'admin' && segments[0] !== '(admin)') {
        router.replace('/(admin)' as any);
      } else if (role === 'student' && segments[0] !== '(tabs)' && segments[0] !== '(user)') {
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, loading, segments]);

  if (loading) {
    return null; // or a splash screen
  }

  return (
    <NavigationThemeProvider value={themeType === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(user)" />
      </Stack>
      <StatusBar style={themeType === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

import { NotificationProvider } from '../context/NotificationContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

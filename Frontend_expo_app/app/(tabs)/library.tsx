import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeToggle } from '../../components/ThemeToggle';

export default function LibraryScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Thư viện</Text>
        <ThemeToggle />
      </View>
      <View style={styles.center}>
        <Text color="inkMuted">Màn hình Thư viện đang được xây dựng</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

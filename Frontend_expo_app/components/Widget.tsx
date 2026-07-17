import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';
import { IconRefresh } from './icons';

export interface WidgetProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  status: 'ready' | 'loading' | 'error' | 'empty';
  onRetry?: () => void;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
}

export function Widget({ title, subtitle, icon, iconColor, iconBgColor, status, onRetry, emptyMessage, emptyAction, children }: WidgetProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          {icon && <View style={[styles.iconWrapper, { backgroundColor: iconBgColor || theme.primaryWeak }]}>{icon}</View>}
          <View style={styles.titleStack}>
            <Text variant="lead" weight="bold">{title}</Text>
            {subtitle && <Text variant="sm" color="inkMuted">{subtitle}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {status === 'loading' && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
        
        {status === 'error' && (
          <View style={styles.centerBox}>
            <Text color="danger">Đã có lỗi xảy ra</Text>
            {onRetry && (
              <View style={{ marginTop: 8 }}>
                <Text color="primary" onPress={onRetry}>Thử lại</Text>
              </View>
            )}
          </View>
        )}
        
        {status === 'empty' && (
          <View style={styles.centerBox}>
            <Text color="inkMuted" style={{ marginBottom: 12 }}>{emptyMessage || 'Không có dữ liệu'}</Text>
            {emptyAction}
          </View>
        )}
        
        {status === 'ready' && children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleStack: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  centerBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

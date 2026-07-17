import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { View, TouchableOpacity } from 'react-native';
import { IconBell } from '../../components/icons';
import { ThemeToggle } from '../../components/ThemeToggle';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function AdminLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inkMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_500Medium',
          fontSize: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => <TabBarIcon name="dashboard" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="data-sources"
        options={{
          title: 'Nguồn DL',
          tabBarIcon: ({ color }) => <TabBarIcon name="database" color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Người dùng',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Phản hồi',
          tabBarIcon: ({ color }) => <TabBarIcon name="comments" color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Khác',
          tabBarIcon: ({ color }) => <TabBarIcon name="bars" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="batch-jobs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="read-stats"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="audit-logs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

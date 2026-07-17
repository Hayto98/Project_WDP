import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Alert } from 'react-native';

import { useTheme } from '../../context/ThemeContext';
import { IconBell } from '../../components/icons';
import { ThemeToggle } from '../../components/ThemeToggle';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      backBehavior="history"
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
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Tìm kiếm',
          tabBarIcon: ({ color }) => <TabBarIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Xu hướng',
          tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Thư viện',
          tabBarIcon: ({ color }) => <TabBarIcon name="bookmark" color={color} />,
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
        name="workspace"
        options={{
          href: null,
          title: 'Workspace',
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="gap"
        options={{
          href: null,
          title: 'Research Gap',
          headerShown: true,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.ink,
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <Tabs.Screen
        name="follow"
        options={{
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: 'Hộp thư',
          headerShown: false
        }}
      />
    </Tabs>
  );
}

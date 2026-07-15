import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../Text';
import { type WorkspaceMember } from '../../lib/api';

export function WorkspaceMembers({ members }: { members: WorkspaceMember[] }) {
  const { theme } = useTheme();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="title" weight="bold" style={{ marginBottom: 16 }}>Thành viên nhóm</Text>
      
      {members.map(member => {
        return (
          <View key={member.id} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text weight="bold" color="surface">
                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.info}>
              <Text weight="bold">{member.name ?? 'Unknown'}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: theme.surface2 }]}>
              <Text variant="xs" color="inkMuted">{member.role}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  }
});

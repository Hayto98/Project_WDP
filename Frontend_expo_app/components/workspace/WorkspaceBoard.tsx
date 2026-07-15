import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../Text';
import { type WorkspaceItem } from '../../lib/api';

export function WorkspaceBoard({ items, onItemPress }: { items: WorkspaceItem[], onItemPress?: (item: WorkspaceItem) => void }) {
  const { theme } = useTheme();

  const columns: { id: string, title: string, color: string }[] = [
    { id: 'backlog', title: 'Cần làm', color: theme.inkMuted },
    { id: 'doing', title: 'Đang làm', color: theme.primary },
    { id: 'done', title: 'Đã xong', color: theme.success },
  ];

  const [activeColumnId, setActiveColumnId] = useState('backlog');

  const activeColumnItems = items.filter(i => i.status === activeColumnId);
  const activeColumn = columns.find(c => c.id === activeColumnId);

  return (
    <View style={styles.boardContainer}>
      {/* Sub-tabs for Columns */}
      <View style={[styles.columnTabs, { backgroundColor: theme.surface2 }]}>
        {columns.map(col => {
          const colCount = items.filter(i => i.status === col.id).length;
          const isActive = col.id === activeColumnId;
          return (
            <TouchableOpacity 
              key={col.id} 
              style={[styles.colTab, isActive && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
              onPress={() => setActiveColumnId(col.id)}
            >
              <Text weight={isActive ? "bold" : "normal"} color={isActive ? "ink" : "inkMuted"}>
                {col.title} ({colCount})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Column Content */}
      <View style={[styles.column, { backgroundColor: theme.surface2 }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.colContent}>
          {activeColumnItems.map(item => (
            <TouchableOpacity key={item.id} style={[styles.card, { backgroundColor: theme.surface }]} onPress={() => onItemPress && onItemPress(item)}>
              <View style={[styles.cardKind, { backgroundColor: theme.surface2 }]}>
                <Text variant="xs" color="inkMuted">{item.kind === 'task' ? 'Công việc' : item.kind === 'note' ? 'Ghi chú' : 'Thảo luận'}</Text>
              </View>
              <Text weight="bold" style={{ marginTop: 8 }}>{item.title}</Text>
              {item.paperId && (
                <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }} numberOfLines={1}>
                  Đính kèm: {item._populatedPaper?.title || item.paperId}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text variant="xs" color="inkMuted">{item.due || ''}</Text>
                {item.comments.length > 0 && (
                  <View style={[styles.commentBadge, { backgroundColor: theme.surface2 }]}>
                    <Text variant="xs" color="inkMuted">{item.comments.length} BL</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardContainer: {
    padding: 16,
    flex: 1,
  },
  columnTabs: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  colTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  column: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
  },
  colContent: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardKind: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  commentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  addBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  }
});

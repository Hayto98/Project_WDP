import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../Text';
import { type WorkspaceItem, type PaperResult } from '../../lib/api';
import { IconExternal } from '../icons';

export function WorkspacePapers({ items, workspaceName }: { items: WorkspaceItem[], workspaceName: string }) {
  const { theme } = useTheme();

  const papers = useMemo(() => {
    const map = new Map<string, PaperResult>();
    items.forEach(item => {
      if (item._populatedPaper && item._populatedPaper.id !== "unknown") {
        map.set(item._populatedPaper.id, item._populatedPaper);
      }
    });
    return Array.from(map.values());
  }, [items]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerArea}>
        <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Tài nguyên</Text>
        <Text variant="heading" weight="bold" style={{ marginBottom: 8 }}>Bài báo trong {workspaceName}</Text>
        <Text variant="sm" color="inkMuted" style={{ lineHeight: 20, marginBottom: 24 }}>
          Danh sách các bài báo đã được liên kết với các task trong workspace này. Các thành viên có thể đọc trực tiếp tóm tắt tại đây.
        </Text>
      </View>

      <View style={styles.list}>
        {papers.map((paper) => (
          <View key={paper.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity 
              style={styles.titleRow} 
              onPress={() => {
                if (paper.url) Linking.openURL(paper.url);
              }}
            >
              <Text weight="bold" style={{ color: theme.primary, flex: 1, fontSize: 16 }}>{paper.title}</Text>
              <IconExternal color={theme.primary} size={16} style={{ marginLeft: 8 }} />
            </TouchableOpacity>

            <View style={styles.metaRow}>
              <Text variant="xs" color="inkMuted">{paper.authors?.join(", ")}</Text>
              <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 4 }}>·</Text>
              <Text variant="xs" weight="bold" color="inkMuted">{paper.year}</Text>
              {paper.source && (
                <>
                  <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 4 }}>·</Text>
                  <Text variant="xs" color="inkMuted">{paper.source}</Text>
                </>
              )}
            </View>

            <Text variant="sm" color="ink" style={{ lineHeight: 22, marginTop: 12 }}>
              {paper.abstract}
            </Text>
          </View>
        ))}
        {papers.length === 0 && (
          <View style={[styles.empty, { backgroundColor: theme.surface2 }]}>
            <Text color="inkMuted">Chưa có bài báo nào được lưu trong workspace này.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  headerArea: {
    marginBottom: 8,
  },
  list: {
    gap: 16,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  empty: {
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  }
});

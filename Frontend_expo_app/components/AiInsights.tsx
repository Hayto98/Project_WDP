import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { IconSparkle, IconChevron } from './icons';
import { formatInt } from '../lib/format';
import type { AiInsight } from '../data/types';

interface Props {
  ai: AiInsight;
}

export function AiInsights({ ai }: Props) {
  const { theme } = useTheme();
  const [openEvidence, setOpenEvidence] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>{ai.summary}</Text>

      <Text variant="body" weight="bold" style={styles.subhead}>Hướng nghiên cứu gợi ý</Text>
      
      <View style={styles.directionsList}>
        {ai.directions.map(d => (
          <View key={d.topic} style={styles.directionItem}>
            <View style={[styles.iconBox, { backgroundColor: theme.primaryWeak }]}>
              <IconSparkle color={theme.primary} size={16} />
            </View>
            <View style={styles.dirBody}>
              <Text weight="bold">{d.topic}</Text>
              <Text variant="sm" color="inkMuted" style={{ marginTop: 2 }}>{d.rationale}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.toggleBtn, { backgroundColor: theme.surface2 }]} 
        onPress={() => setOpenEvidence(!openEvidence)}
      >
        <Text weight="bold" color="inkMuted">Căn cứ phân tích ({ai.evidence.length})</Text>
        <View style={{ transform: [{ rotate: openEvidence ? '180deg' : '0deg' }] }}>
          <IconChevron color={theme.inkMuted} size={16} />
        </View>
      </TouchableOpacity>

      {openEvidence && (
        <View style={[styles.evidenceBox, { backgroundColor: theme.surface2 }]}>
          {ai.evidence.map(e => (
            <View key={e.label} style={styles.evidenceItem}>
              <Text variant="sm" style={{ flex: 1 }}>{e.label}</Text>
              <Text variant="sm" weight="bold">{formatInt(e.papers)} bài</Text>
            </View>
          ))}
        </View>
      )}

      <Text variant="xs" color="inkMuted" style={styles.disclaimer}>
        Tóm tắt do AI tạo từ abstract & metadata — hãy kiểm tra căn cứ trước khi trích dẫn.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  summary: {
    lineHeight: 24,
    marginBottom: 24,
  },
  subhead: {
    marginBottom: 16,
  },
  directionsList: {
    marginBottom: 16,
  },
  directionItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dirBody: {
    flex: 1,
  },
  toggleBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  evidenceBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  evidenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  disclaimer: {
    fontStyle: 'italic',
  },
});

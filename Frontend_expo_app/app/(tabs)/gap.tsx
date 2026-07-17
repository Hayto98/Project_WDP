import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell } from '../../components/icons';

import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { CorpusGapPanel } from '../../components/CorpusGapPanel';
import { LiveGapPanel } from '../../components/LiveGapPanel';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function GapScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState<"corpus" | "live">("corpus");

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Research Gap</Text>
        <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
          {mode === "corpus" 
            ? "Phân tích khoảng trống từ corpus nội bộ — quan tâm cao nhưng công bố còn thưa"
            : "Phân tích live từ OpenAlex / Crossref / arXiv — không cần import trước vào DB"
          }
        </Text>
        
        <View style={[styles.segmentContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.segmentButton, mode === "corpus" && { backgroundColor: theme.primary }]} 
            onPress={() => setMode("corpus")}
          >
            <Text variant="sm" weight="bold" color={mode === "corpus" ? "surface" : "ink"}>Corpus Gap</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.segmentButton, mode === "live" && { backgroundColor: theme.primary }]} 
            onPress={() => setMode("live")}
          >
            <Text variant="sm" weight="bold" color={mode === "live" ? "surface" : "ink"}>Live Gap</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {mode === "corpus" ? <CorpusGapPanel /> : <LiveGapPanel />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingBottom: 8 },
  segmentContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
});

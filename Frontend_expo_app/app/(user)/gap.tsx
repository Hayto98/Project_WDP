import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ResearchGapHeatmap } from '../../components/ResearchGapHeatmap';
import { makeDashboardData } from '../../data/sample';

export default function GapScreen() {
  const { theme } = useTheme();
  const data = makeDashboardData('12m');

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Khoảng trống nghiên cứu</Text>
        <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>
          Khám phá những vùng có tiềm năng cao nhưng chưa được khai thác nhiều
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ResearchGapHeatmap fields={data.gapFields} aspects={data.gapAspects} gaps={data.gaps} />
      </View>

      <View style={{ marginTop: 24 }}>
        <Text variant="lead" weight="bold" style={{ marginBottom: 16 }}>Gợi ý đề tài</Text>
        {data.gaps.filter(g => g.gap).slice(0, 3).map((gap, i) => (
          <View key={i} style={[styles.suggestionCard, { backgroundColor: theme.surface2 }]}>
            <Text variant="body" weight="bold">{gap.field}</Text>
            <Text variant="sm" color="inkMuted" style={{ marginTop: 4 }}>Khía cạnh: {gap.aspect}</Text>
            <View style={[styles.badge, { backgroundColor: theme.warning + '30', marginTop: 8 }]}>
              <Text variant="xs" color="warning" weight="bold">Mật độ thấp, tiềm năng cao</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 24 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  suggestionCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 }
});

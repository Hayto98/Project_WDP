import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../context/ThemeContext';
import { Widget } from './Widget';
import { TrendChart } from './TrendChart';
import { analyticsApi } from '../lib/api';
import { IconTrend } from './icons';

const LIVE_SOURCES = ["OpenAlex", "Crossref", "arXiv"];

export function LiveTrendPanel() {
  const { theme } = useTheme();
  const [topic, setTopic] = useState("federated learning medical imaging");
  const [sources, setSources] = useState<Set<string>>(new Set(["OpenAlex", "Crossref", "arXiv"]));
  const [yearFrom, setYearFrom] = useState("2021");
  const [yearTo, setYearTo] = useState(new Date().getFullYear().toString());
  const [maxRecords, setMaxRecords] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const toggleSource = (s: string) => {
    setSources(prev => {
      const next = new Set(prev);
      if (next.has(s) && next.size > 1) {
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const runLive = async () => {
    const cleaned = topic.trim();
    if (!cleaned || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await analyticsApi.liveTrends({
        topic: cleaned,
        sources: Array.from(sources),
        yearFrom: parseInt(yearFrom, 10) || 2021,
        yearTo: parseInt(yearTo, 10) || new Date().getFullYear(),
        maxRecordsPerSource: maxRecords,
      });
      setResult(data);
    } catch (err: any) {
      setResult(null);
      setError(err.message || "Không thể phân tích Live Trends");
    } finally {
      setLoading(false);
    }
  };

  const series = useMemo(() => {
    if (!result?.trendPoints?.length) return [];
    return analyticsApi.seriesFromPoints(result.trendPoints);
  }, [result]);

  return (
    <View style={styles.container}>
      <Widget title="Live Trend Analysis" subtitle="Phân tích xu hướng công bố trong thời gian thực từ các thư viện mở." status="ready">
        <View style={styles.formGroup}>
          <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Topic / Keywords</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
            value={topic}
            onChangeText={setTopic}
            placeholder="Ví dụ: federated learning"
            placeholderTextColor={theme.inkMuted}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Từ năm</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              value={yearFrom}
              onChangeText={setYearFrom}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 4 }}>Đến năm</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              value={yearTo}
              onChangeText={setYearTo}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 8 }}>Nguồn dữ liệu</Text>
          <View style={styles.sourceChips}>
            {LIVE_SOURCES.map(s => {
              const on = sources.has(s);
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { borderColor: theme.border }, on && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => toggleSource(s)}
                >
                  <Text variant="sm" color={on ? 'surface' : 'ink'}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text variant="sm" weight="bold" color="inkMuted" style={{ marginBottom: 8 }}>Số bài tối đa mỗi nguồn</Text>
          <View style={styles.sourceChips}>
            {[
              { value: 20, label: "20 (nhanh)" },
              { value: 50, label: "50 (chuẩn)" },
              { value: 100, label: "100 (chậm)" }
            ].map(opt => {
              const on = maxRecords === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, { borderColor: theme.border }, on && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setMaxRecords(opt.value)}
                >
                  <Text variant="sm" color={on ? 'surface' : 'ink'}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {error ? (
          <Text variant="sm" color="danger" style={{ marginBottom: 12 }}>{error}</Text>
        ) : null}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]} 
          onPress={runLive}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.surface} size="small" />
          ) : (
            <Text variant="body" weight="bold" color="surface">Phân tích Live</Text>
          )}
        </TouchableOpacity>
      </Widget>

      {result && result.trendPoints && result.trendPoints.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text variant="sm" color="inkMuted" style={{ marginBottom: 16 }}>Đã quét {result.totalFound} bài báo từ {result.sourcesCount} nguồn.</Text>
          <Widget 
            title="So sánh xu hướng theo thời gian" 
            subtitle="Số bài báo liên quan"
            status="ready"
          >
            <TrendChart data={result.trendPoints} series={series} />
          </Widget>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  sourceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

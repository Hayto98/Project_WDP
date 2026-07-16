import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';
import { analyticsApi, aiApi } from '../lib/api';
import { formatInt } from '../lib/format';

const LIVE_SOURCES = ["OpenAlex", "Crossref", "arXiv"];

export function LiveGapPanel() {
  const { theme } = useTheme();
  
  const [topic, setTopic] = useState("federated learning medical imaging");
  const [sources, setSources] = useState<string[]>(["OpenAlex"]);
  const [yearFrom, setYearFrom] = useState("2021");
  const [yearTo, setYearTo] = useState("2026");
  const [maxRecords, setMaxRecords] = useState("20");
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const selectedItem = useMemo(() => {
    return result?.gaps?.find((g: any) => g.id === selectedId) || result?.gaps?.[0] || null;
  }, [result, selectedId]);

  const toggleSource = (src: string) => {
    setSources(prev => {
      if (prev.includes(src)) {
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== src);
      }
      return [...prev, src];
    });
  };

  const runLive = async () => {
    const cleanedTopic = topic.trim();
    if (!cleanedTopic || loading) return;
    
    setLoading(true);
    setError("");
    setResult(null);
    setAiSuggestion("");
    
    try {
      const data = await analyticsApi.liveGaps({
        topic: cleanedTopic,
        sources,
        yearFrom: parseInt(yearFrom, 10),
        yearTo: parseInt(yearTo, 10),
        maxRecordsPerSource: parseInt(maxRecords, 10),
        topK: 12
      });
      setResult(data);
      if (data.gaps?.length) {
        setSelectedId(data.gaps[0].id);
      } else {
        setError("Không đủ tín hiệu gap với bộ lọc hiện tại.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi phân tích live.");
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await analyticsApi.saveLiveGaps(result);
      Alert.alert("Thành công", "Đã lưu kết quả phân tích live.");
    } catch (err) {
      Alert.alert("Lỗi", "Không lưu được phân tích.");
    } finally {
      setSaving(false);
    }
  };

  const requestAiSuggestion = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const fakeGapItem = {
        id: selectedItem.id,
        fieldKey: selectedItem.id,
        fieldLabel: selectedItem.field,
        token: "--c1",
        aspect: selectedItem.aspect,
        fi: 0, ai: 0,
        density: 1 - selectedItem.metrics.scarcityScore,
        interest: selectedItem.metrics.adjacencyScore,
        papers: selectedItem.metrics.directCount,
        keywords: [selectedItem.field, selectedItem.aspect],
        direction: selectedItem.reasons[0] || "",
        trend: [],
        score: selectedItem.gapScore / 100,
        evidence: []
      };
      const res = await aiApi.suggestDirections({ field: `${selectedItem.field} / ${selectedItem.aspect}`, gaps: [fakeGapItem] });
      const first = res.directions[0];
      setAiSuggestion(first ? `${first.topic}: ${first.rationale}` : "AI chưa có gợi ý thêm.");
    } catch (err) {
      setAiSuggestion("Lỗi tải gợi ý AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const levelLabel = (level: string) => {
    if (level === "strong") return "Gap mạnh";
    if (level === "potential") return "Gap tiềm năng";
    if (level === "needs_data") return "Cần thêm dữ liệu";
    return "Chưa rõ";
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text variant="body" weight="bold" style={{ marginBottom: 16 }}>Tham số phân tích</Text>
        
        <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Chủ đề nghiên cứu</Text>
        <TextInput 
          style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
          value={topic}
          onChangeText={setTopic}
          placeholder="Nhập chủ đề..."
          placeholderTextColor={theme.inkMuted}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Từ năm</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
              value={yearFrom}
              onChangeText={setYearFrom}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Đến năm</Text>
            <TextInput 
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
              value={yearTo}
              onChangeText={setYearTo}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text variant="sm" weight="bold" style={{ marginBottom: 8, marginTop: 8 }}>Số bài mỗi nguồn</Text>
        <TextInput 
          style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
          value={maxRecords}
          onChangeText={setMaxRecords}
          keyboardType="numeric"
        />

        <Text variant="sm" weight="bold" style={{ marginBottom: 8, marginTop: 8 }}>Nguồn dữ liệu</Text>
        <View style={styles.chipsRow}>
          {LIVE_SOURCES.map(src => (
            <TouchableOpacity 
              key={src} 
              style={[
                styles.chip, 
                { borderColor: theme.border },
                sources.includes(src) && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => toggleSource(src)}
            >
              <Text variant="xs" weight="bold" color={sources.includes(src) ? "surface" : "inkMuted"}>{src}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: theme.primary, opacity: (!topic.trim() || loading) ? 0.6 : 1 }]} 
          onPress={runLive}
          disabled={!topic.trim() || loading}
        >
          {loading ? <ActivityIndicator size="small" color={theme.surface} /> : <Text color="surface" weight="bold">Phân tích Live</Text>}
        </TouchableOpacity>
        
        {result && (
          <TouchableOpacity 
            style={[styles.btnOutline, { borderColor: theme.border, marginTop: 12 }]} 
            onPress={saveAnalysis}
            disabled={saving || loading}
          >
            {saving ? <ActivityIndicator size="small" color={theme.ink} /> : <Text weight="bold">Lưu phân tích</Text>}
          </TouchableOpacity>
        )}
        
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: theme.danger + '20', borderColor: theme.danger }]}>
            <Text variant="sm" color="danger">{error}</Text>
          </View>
        )}
      </View>

      {result && (
        <View style={{ marginTop: 24 }}>
          <Text variant="sm" color="inkMuted" style={{ marginBottom: 16 }}>
            Đã quét {formatInt(result.totalFetched)} bài từ {result.sources.length} nguồn. Gap mạnh: {result.summary.strongGaps}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Ứng viên gap (Live)</Text>
            {result.gaps.map((g: any, idx: number) => (
              <TouchableOpacity 
                key={`${g.id}-${idx}`} 
                style={[
                  styles.rankItem, 
                  { borderBottomColor: theme.border },
                  selectedItem?.id === g.id && { backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 }
                ]}
                onPress={() => setSelectedId(g.id)}
              >
                <Text variant="sm" weight="bold" style={{ width: 24 }}>{idx + 1}.</Text>
                <View style={{ backgroundColor: theme.primary, width: 10, height: 10, borderRadius: 5, marginRight: 10 }} />
                <View style={styles.rankContent}>
                  <Text variant="sm" weight="bold">{g.field} · {g.aspect}</Text>
                  <Text variant="xs" color="inkMuted">
                    {levelLabel(g.level)} · Trực tiếp {g.metrics.directCount} bài
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 48, height: 4, backgroundColor: theme.border, borderRadius: 2, marginRight: 8, overflow: 'hidden' }}>
                    <View style={{ width: `${g.gapScore}%`, height: '100%', backgroundColor: theme.primary }} />
                  </View>
                  <Text variant="sm" weight="bold" color="primary" style={{ width: 24, textAlign: 'right' }}>{g.gapScore}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {selectedItem && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
              <View style={styles.gapHeader}>
                <View>
                  <Text variant="body" weight="bold">{selectedItem.field}</Text>
                  <Text variant="sm" color="inkMuted">{selectedItem.aspect}</Text>
                </View>
                <Text variant="sm" weight="bold" color="primary">{levelLabel(selectedItem.level)} · {selectedItem.gapScore}</Text>
              </View>
              
              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text variant="heading" weight="bold">{selectedItem.metrics.directCount}</Text>
                  <Text variant="xs" color="inkMuted">Trực tiếp</Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="heading" weight="bold">{Math.round(selectedItem.metrics.expectedCount)}</Text>
                  <Text variant="xs" color="inkMuted">Kỳ vọng</Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="heading" weight="bold">{Math.round(selectedItem.metrics.growthRate * 100)}%</Text>
                  <Text variant="xs" color="inkMuted">Tăng trưởng</Text>
                </View>
                <View style={styles.metric}>
                  <Text variant="heading" color="primary" weight="bold">{selectedItem.gapScore}</Text>
                  <Text variant="xs" color="inkMuted">Điểm gap</Text>
                </View>
              </View>

              <View style={{ marginTop: 16 }}>
                <Text variant="sm" weight="bold" style={{ marginBottom: 4 }}>Lý do</Text>
                {selectedItem.reasons.map((r: string, idx: number) => (
                  <Text key={idx} variant="sm" color="inkMuted" style={{ marginBottom: 4 }}>• {r}</Text>
                ))}
              </View>

              <View style={{ marginTop: 16 }}>
                <Text variant="sm" weight="bold" style={{ marginBottom: 4 }}>Paper bằng chứng ({selectedItem.evidence.length})</Text>
                {selectedItem.evidence.slice(0, 3).map((p: any, idx: number) => (
                  <Text key={idx} variant="xs" color="inkMuted" style={{ marginBottom: 4, lineHeight: 16 }}>
                    • {p.title} ({p.year || "?"}) - {p.source}
                  </Text>
                ))}
              </View>

              <View style={{ marginTop: 16 }}>
                <Text variant="sm" weight="bold" style={{ marginBottom: 4 }}>Gợi ý đề tài bằng AI</Text>
                
                <TouchableOpacity 
                  style={[styles.btnOutline, { borderColor: theme.border, marginTop: 8 }]} 
                  onPress={requestAiSuggestion}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <ActivityIndicator size="small" color={theme.ink} />
                  ) : (
                    <Text variant="sm" weight="bold">AI Gợi ý thêm</Text>
                  )}
                </TouchableOpacity>
                
                {!!aiSuggestion && (
                  <View style={[styles.aiSummary, { backgroundColor: theme.surface2, marginTop: 12 }]}>
                    <Text variant="sm">{aiSuggestion}</Text>
                  </View>
                )}
              </View>

            </View>
          )}

          {!!result.sourceErrors?.length && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
              <Text variant="body" weight="bold" color="warning" style={{ marginBottom: 8 }}>Cảnh báo nguồn</Text>
              {result.sourceErrors.map((e: any, idx: number) => (
                <Text key={idx} variant="sm" color="inkMuted" style={{ marginBottom: 4 }}>
                  <Text weight="bold">{e.source}</Text>: {e.message}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 0.48 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8
  },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnOutline: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  errorBox: { padding: 12, borderRadius: 8, marginTop: 16, borderWidth: 1 },
  rankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rankContent: { flex: 1 },
  gapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  metric: { alignItems: 'center', width: '25%' },
  aiSummary: { padding: 12, borderRadius: 8, marginBottom: 4 },
});

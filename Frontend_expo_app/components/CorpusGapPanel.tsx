import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';
import { ResearchGapHeatmap } from './ResearchGapHeatmap';
import { Sparkline } from './Sparkline';
import { GapScatter } from './GapScatter';
import { analyticsApi, aiApi } from '../lib/api';
import { formatInt } from '../lib/format';

export function CorpusGapPanel() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [threshold, setThreshold] = useState(0.35);

  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());
  const [activeAspects, setActiveAspects] = useState<Set<string>>(new Set());

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await analyticsApi.gaps(threshold);
      setData(res);
      
      const allFields = new Set(res.items.map((i: any) => i.fieldLabel));
      const allAspects = new Set(res.items.map((i: any) => i.aspect));
      setActiveFields(allFields as Set<string>);
      setActiveAspects(allAspects as Set<string>);

      // Auto select the first gap
      const firstGap = res.items.find((i: any) => i.score >= 0.4) || res.items[0];
      if (firstGap) {
        setSelectedField(firstGap.fieldLabel);
        setSelectedAspect(firstGap.aspect);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load data once, threshold is handled client-side for filtering
    if (!data) loadData();
  }, []);

  const items = data?.items || [];
  
  const allFieldsOptions = useMemo(() => {
    const seen = new Map();
    items.forEach((i: any) => {
      if (!seen.has(i.fieldLabel)) seen.set(i.fieldLabel, i.token);
    });
    return Array.from(seen.entries()).map(([label, token]) => ({ label, token }));
  }, [items]);

  const allAspectsOptions = useMemo(() => {
    return Array.from(new Set(items.map((i: any) => i.aspect))) as string[];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((i: any) => activeFields.has(i.fieldLabel) && activeAspects.has(i.aspect));
  }, [items, activeFields, activeAspects]);

  const gapItems = useMemo(() => {
    return filteredItems.filter((i: any) => i.density <= threshold).sort((a: any, b: any) => b.score - a.score);
  }, [filteredItems, threshold]);

  const heatmapGaps = useMemo(() => {
    return filteredItems.map((i: any) => ({
      field: i.fieldLabel,
      aspect: i.aspect,
      density: i.density,
      papers: i.papers,
      gap: i.density <= threshold
    }));
  }, [filteredItems, threshold]);

  const selectedItem = useMemo(() => {
    return items.find((i: any) => i.fieldLabel === selectedField && i.aspect === selectedAspect);
  }, [items, selectedField, selectedAspect]);

  const requestAiSuggestion = async () => {
    if (!selectedItem) return;
    setAiLoading(true);
    setAiSuggestion("");
    try {
      const res = await aiApi.suggestDirections({ field: selectedItem.fieldLabel, gaps: [selectedItem] });
      const first = res.directions[0];
      setAiSuggestion(first ? `${first.topic}: ${first.rationale}` : "AI chưa có gợi ý mới.");
    } catch (err) {
      setAiSuggestion("Lỗi tải gợi ý AI.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    setAiSuggestion("");
  }, [selectedField, selectedAspect]);

  const toggleField = (f: string) => {
    setActiveFields(prev => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const toggleAspect = (a: string) => {
    setActiveAspects(prev => {
      const next = new Set(prev);
      next.has(a) ? next.delete(a) : next.add(a);
      return next;
    });
  };

  const resolveColor = (token: string) => {
    if (token === '--c1') return theme.primary;
    if (token === '--c2') return '#8a2be2';
    if (token === '--c3') return theme.warning;
    if (token === '--c4') return '#ff1493';
    if (token === '--c5') return theme.success;
    if (token === '--c6') return '#ffa500';
    return theme.primary;
  };

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text color="danger">{error}</Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={loadData}>
          <Text color="surface" weight="bold">Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      
      {/* Filters and Controls */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
        <View style={styles.thresholdRow}>
          <Text variant="sm" weight="bold">Ngưỡng mật độ ≤ <Text color="primary">{Math.round(threshold * 100)}%</Text></Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={[styles.stepBtn, { borderColor: theme.border }]} 
              onPress={() => setThreshold(t => Math.max(0.1, t - 0.05))}
            >
              <Text weight="bold" color="inkMuted">-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.stepBtn, { borderColor: theme.border, marginLeft: 8 }]} 
              onPress={() => setThreshold(t => Math.min(0.6, t + 0.05))}
            >
              <Text weight="bold" color="inkMuted">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text variant="xs" color="inkMuted" style={{ marginTop: 12, marginBottom: 8 }}>Lĩnh vực</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
          {allFieldsOptions.map(f => {
            const on = activeFields.has(f.label);
            return (
              <TouchableOpacity 
                key={f.label} 
                style={[
                  styles.chip, 
                  { borderColor: theme.border, backgroundColor: on ? theme.surface2 : theme.surface }
                ]}
                onPress={() => toggleField(f.label)}
              >
                <View style={[styles.chipDot, { backgroundColor: resolveColor(f.token) }]} />
                <Text variant="xs" color={on ? "ink" : "inkMuted"}>{f.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text variant="xs" color="inkMuted" style={{ marginBottom: 8 }}>Khía cạnh</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
          {allAspectsOptions.map(a => {
            const on = activeAspects.has(a);
            return (
              <TouchableOpacity 
                key={a} 
                style={[
                  styles.chip, 
                  { borderColor: theme.border, backgroundColor: on ? theme.surface2 : theme.surface }
                ]}
                onPress={() => toggleAspect(a)}
              >
                <Text variant="xs" color={on ? "ink" : "inkMuted"}>{a}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
          <Text variant="sm" color="inkMuted">Khoảng trống</Text>
          <Text variant="heading" weight="bold">{formatInt(gapItems.length)}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.surface }]}>
          <Text variant="sm" color="inkMuted">Điểm cơ hội TB</Text>
          <Text variant="heading" weight="bold">
            {gapItems.length ? Math.round(gapItems.reduce((a: number, c: any) => a + c.score, 0) / gapItems.length * 100) : 0}
          </Text>
        </View>
      </View>

      {data?.ai?.summary ? (
        <View style={[styles.aiSummary, { backgroundColor: theme.surface2 }]}>
          <Text variant="sm">{data.ai.summary}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Bản đồ khoảng trống</Text>
        <Text variant="xs" color="inkMuted" style={{ marginBottom: 16 }}>Chạm vào ô để xem chi tiết</Text>
        <ResearchGapHeatmap 
          fields={Array.from(activeFields)} 
          aspects={Array.from(activeAspects)} 
          gaps={heatmapGaps}
          selectedField={selectedField}
          selectedAspect={selectedAspect}
          onSelect={(f, a) => {
            setSelectedField(f);
            setSelectedAspect(a);
          }}
        />
      </View>

      {selectedItem ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
          <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Chi tiết khoảng trống</Text>
          
          <View style={[styles.gapHeader, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dot, { backgroundColor: resolveColor(selectedItem.token) }]} />
              <View>
                <Text variant="body" weight="bold">{selectedItem.fieldLabel}</Text>
                <Text variant="sm" color="inkMuted">{selectedItem.aspect}</Text>
              </View>
            </View>
            {selectedItem.density <= threshold && (
              <View style={{ backgroundColor: theme.surface2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                <Text variant="xs" color="primary" weight="bold">◆ Khoảng trống</Text>
              </View>
            )}
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.surface2 }]}>
              <Text variant="heading" weight="bold">{formatInt(selectedItem.papers)}</Text>
              <Text variant="xs" color="inkMuted">Công bố</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.surface2 }]}>
              <Text variant="heading" weight="bold">{Math.round(selectedItem.density * 100)}%</Text>
              <Text variant="xs" color="inkMuted">Mật độ</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.surface2 }]}>
              <Text variant="heading" weight="bold">{Math.round(selectedItem.interest * 100)}%</Text>
              <Text variant="xs" color="inkMuted">Quan tâm</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.surface2 }]}>
              <Text variant="heading" color="primary" weight="bold">{Math.round(selectedItem.score * 100)}</Text>
              <Text variant="xs" color="inkMuted">Điểm cơ hội</Text>
            </View>
          </View>

          {selectedItem.trend && selectedItem.trend.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text variant="sm" color="inkMuted" style={{ marginBottom: 4 }}>Xu hướng công bố 6 kỳ</Text>
              <Sparkline values={selectedItem.trend} token={selectedItem.token} />
            </View>
          )}

          {selectedItem.keywords && selectedItem.keywords.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text variant="sm" color="inkMuted" style={{ marginBottom: 8 }}>Từ khóa liên quan</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {selectedItem.keywords.map((k: string) => (
                  <View key={k} style={[styles.keywordTag, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
                    <Text variant="xs">{k}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {selectedItem.evidence && selectedItem.evidence.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text variant="sm" color="inkMuted" style={{ marginBottom: 8 }}>Paper đại diện trong corpus</Text>
              {selectedItem.evidence.map((p: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 8 }}>
                  <Text variant="sm">{p.title} {p.year ? `(${p.year})` : ''}</Text>
                  {p.citations !== undefined && <Text variant="xs" color="inkMuted">{formatInt(p.citations)} citations</Text>}
                </View>
              ))}
            </View>
          )}

          {selectedItem.direction ? (
            <View style={{ marginTop: 16 }}>
              <Text variant="sm" color="inkMuted" style={{ marginBottom: 4 }}>Gợi ý hướng nghiên cứu</Text>
              <Text variant="sm">{selectedItem.direction}</Text>
              
              <TouchableOpacity 
                style={[styles.btnOutline, { borderColor: theme.border, marginTop: 12 }]} 
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
          ) : null}
        </View>
      ) : null}
      
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
        <Text variant="body" weight="bold" style={{ marginBottom: 4 }}>Tiềm năng × Mật độ</Text>
        <Text variant="xs" color="inkMuted" style={{ marginBottom: 16 }}>Góc trên-trái = quan tâm cao, công bố thấp = khoảng trống</Text>
        <GapScatter
          items={filteredItems}
          densityThreshold={threshold}
          selectedId={selectedItem?.id || null}
          onSelect={(id) => {
            const item = items.find((i: any) => i.id === id);
            if (item) {
              setSelectedField(item.fieldLabel);
              setSelectedAspect(item.aspect);
            }
          }}
        />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
        <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Xếp hạng cơ hội nghiên cứu</Text>
        {gapItems.map((g: any, idx: number) => (
          <TouchableOpacity 
            key={`${g.id}-${idx}`} 
            style={[
              styles.rankItem, 
              { borderBottomColor: theme.border },
              selectedItem?.id === g.id && { backgroundColor: theme.surface2, borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 }
            ]}
            onPress={() => {
              setSelectedField(g.fieldLabel);
              setSelectedAspect(g.aspect);
            }}
          >
            <Text variant="sm" weight="bold" style={{ width: 24 }}>{idx + 1}.</Text>
            <View style={[styles.dot, { backgroundColor: resolveColor(g.token), width: 10, height: 10, marginRight: 10 }]} />
            <View style={styles.rankContent}>
              <Text variant="sm" weight="bold">{g.fieldLabel} · {g.aspect}</Text>
              <Text variant="xs" color="inkMuted">
                {formatInt(g.papers)} bài · mật độ {Math.round(g.density * 100)}% · quan tâm {Math.round(g.interest * 100)}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 48, height: 4, backgroundColor: theme.border, borderRadius: 2, marginRight: 8, overflow: 'hidden' }}>
                <View style={{ width: `${g.score * 100}%`, height: '100%', backgroundColor: resolveColor(g.token) }} />
              </View>
              <Text variant="sm" weight="bold" style={{ width: 24, textAlign: 'right' }}>{Math.round(g.score * 100)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, padding: 16, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  aiSummary: { padding: 12, borderRadius: 8, marginBottom: 16 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  btnOutline: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  gapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  metric: { alignItems: 'center', width: '25%' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', padding: 12, borderRadius: 8, marginBottom: 8 },
  keywordTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginRight: 6, marginBottom: 6 },
  rankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rankContent: { flex: 1 },
});

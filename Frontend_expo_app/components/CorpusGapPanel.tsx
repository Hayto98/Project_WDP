import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Text } from './Text';
import { analyticsApi, aiApi } from '../lib/api';



export function CorpusGapPanel() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [threshold, setThreshold] = useState(0.35);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [aspects, setAspects] = useState<Set<string>>(new Set());

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await analyticsApi.gaps(0.35);
      setData(res);
      setFields(new Set((res.items || []).map((item: any) => item.fieldKey)));
      setAspects(new Set((res.items || []).map((item: any) => item.aspect)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const items = data?.items || [];
  
  const fieldOptions = useMemo(() => {
    const seen = new Map<string, { key: string; label: string; token: string }>();
    for (const item of items) {
      if (!seen.has(item.fieldKey)) {
        seen.set(item.fieldKey, { key: item.fieldKey, label: item.fieldLabel, token: item.token });
      }
    }
    return [...seen.values()];
  }, [items]);

  const aspectOptions = useMemo(() => {
    return [...new Set(items.map((item: any) => item.aspect))];
  }, [items]);
  
  const gapItems = useMemo(() => {
    return items
      .filter((i: any) => fields.has(i.fieldKey) && aspects.has(i.aspect))
      .filter((i: any) => i.gap || i.density <= threshold)
      .sort((a: any, b: any) => b.score - a.score);
  }, [items, threshold, fields, aspects]);

  const strongest = gapItems[0];
  const avgScore = gapItems.length
    ? gapItems.reduce((sum: number, g: any) => sum + g.score, 0) / gapItems.length
    : 0;

  function withOpacity(color: string, opacity: number) {
    if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${opacity})`);
    if (color.startsWith('#') && color.length === 7) return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
    return color;
  }

  function degreeFor(score: number): { key: string; label: string; color: string } {
    if (score >= 0.7) return { key: "very-high", label: "Rất cao", color: theme.success || '#10b981' };
    if (score >= 0.5) return { key: "high", label: "Cao", color: theme.primary };
    if (score >= 0.3) return { key: "medium", label: "Trung bình", color: theme.warning || '#f59e0b' };
    return { key: "low", label: "Thấp", color: theme.danger || '#ef4444' };
  }

  function tokenToColor(token: string) {
    switch (token) {
      case '--c1': return '#0d9488'; // teal
      case '--c2': return '#6366f1'; // indigo
      case '--c3': return '#d97706'; // amber
      case '--c4': return '#db2777'; // pink
      case '--c5': return '#ea580c'; // orange
      case '--c6': return '#059669'; // emerald
      default: return theme.primary;
    }
  }

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
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
      
      {/* Controls: Threshold and Chips */}
      <View style={[styles.filterCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.thresholdRow}>
          <Text variant="sm">Ngưỡng mật độ ≤ <Text weight="bold">{Math.round(threshold * 100)}%</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => setThreshold(prev => Math.max(0.1, prev - 0.05))} style={[styles.btnOutline, { paddingVertical: 4, paddingHorizontal: 12 }]}><Text variant="sm" weight="bold">-</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setThreshold(prev => Math.min(0.6, prev + 0.05))} style={[styles.btnOutline, { paddingVertical: 4, paddingHorizontal: 12 }]}><Text variant="sm" weight="bold">+</Text></TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}>
          {fieldOptions.map(f => {
            const on = fields.has(f.key);
            const color = tokenToColor(f.token);
            return (
              <TouchableOpacity 
                key={f.key} 
                onPress={() => setFields(prev => { const n = new Set(prev); n.has(f.key) ? n.delete(f.key) : n.add(f.key); return n; })}
                style={[styles.chip, on ? { borderColor: color, backgroundColor: withOpacity(color, 0.1) } : { borderColor: theme.border }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: on ? color : theme.borderStrong }} />
                  <Text variant="xs" style={{ color: on ? color : theme.ink }}>{f.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
          {aspectOptions.map(a => {
            const on = aspects.has(a as string);
            return (
              <TouchableOpacity 
                key={a as string} 
                onPress={() => setAspects(prev => { const n = new Set(prev); n.has(a as string) ? n.delete(a as string) : n.add(a as string); return n; })}
                style={[styles.chip, on ? { borderColor: theme.inkMuted, backgroundColor: theme.surface2 } : { borderColor: theme.border }]}
              >
                <Text variant="xs" style={{ color: on ? theme.ink : theme.inkMuted }}>{a as string}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Summary Header matching the web trendsum blocks */}
      <View style={styles.summaryStrip}>
        <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text variant="xs" color="inkMuted">Khoảng trống phát hiện</Text>
          <Text variant="heading" weight="bold" style={{ marginTop: 4 }}>{gapItems.length}</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text variant="xs" color="inkMuted">Điểm cơ hội TB</Text>
          <Text variant="heading" weight="bold" style={{ marginTop: 4 }}>{Math.round(avgScore * 100)}</Text>
        </View>
      </View>
      <View style={[styles.summaryBox, { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 16 }]}>
        <Text variant="xs" color="inkMuted">Cơ hội nổi bật nhất</Text>
        <Text variant="body" weight="bold" style={{ marginTop: 4 }}>
          {strongest ? `${strongest.fieldLabel} · ${strongest.aspect}` : "—"}
        </Text>
      </View>

      {/* AI Summary if available */}
      {data?.ai?.summary ? (
        <View style={[styles.aiBox, { backgroundColor: withOpacity(theme.primary, 0.1), borderColor: withOpacity(theme.primary, 0.3) }]}>
          <Text variant="sm" weight="bold" style={{ color: theme.primary, marginBottom: 4 }}>✨ AI Phân tích</Text>
          <Text variant="sm" color="ink">{data.ai.summary}</Text>
          {data.ai.directions && data.ai.directions.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {data.ai.directions.slice(0, 3).map((dir: any, idx: number) => (
                <Text key={idx} variant="sm" style={{ marginTop: 4 }}>
                  <Text weight="bold">• {dir.topic}: </Text>
                  <Text>{dir.rationale}</Text>
                </Text>
              ))}
            </View>
          )}
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: theme.surface2 }]}>
            <Text variant="heading" style={{ fontSize: 24 }}>⏱️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="body" weight="bold">Bản đồ cơ hội nghiên cứu</Text>
            <Text variant="sm" color="inkMuted">Trạng thái theo Lĩnh vực × Khía cạnh</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <View style={styles.list}>
          {gapItems.map((g: any, idx: number) => {
            const degree = degreeFor(g.score);
            const isExpanded = expandedId === g.id;
            
            return (
              <View key={`${g.id}-${idx}`} style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <TouchableOpacity 
                  style={[styles.listItem, isExpanded && { backgroundColor: theme.surface2 }]} 
                  onPress={() => toggleExpand(g.id)}
                  activeOpacity={0.7}
                >
                  <Text variant="sm" color="inkMuted" style={styles.rank}>{idx + 1}</Text>
                  
                  <View style={styles.itemContent}>
                    <Text variant="sm" weight="bold">{g.fieldLabel}</Text>
                    <Text variant="xs" color="inkMuted">{g.aspect} · {g.papers} bài</Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <View style={styles.progressRow}>
                      <Text variant="xs" color="inkMuted" style={{ width: 60 }}>Quan tâm</Text>
                      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.progressFill, { width: `${Math.round(g.interest * 100)}%`, backgroundColor: theme.primary }]} />
                      </View>
                      <Text variant="xs" weight="bold" style={{ width: 28, textAlign: 'right' }}>{Math.round(g.interest * 100)}%</Text>
                    </View>
                    <View style={[styles.progressRow, { marginTop: 4 }]}>
                      <Text variant="xs" color="inkMuted" style={{ width: 60 }}>Khan hiếm</Text>
                      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                        <View style={[styles.progressFill, { width: `${Math.round((1 - g.density) * 100)}%`, backgroundColor: theme.primary }]} />
                      </View>
                      <Text variant="xs" weight="bold" style={{ width: 28, textAlign: 'right' }}>{Math.round((1 - g.density) * 100)}%</Text>
                    </View>
                  </View>

                  <View style={[styles.badge, { backgroundColor: withOpacity(degree.color, 0.2) }]}>
                    <Text variant="xs" weight="bold" style={{ color: degree.color }}>{Math.round(g.score * 100)}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <GapDetail item={g} theme={theme} withOpacity={withOpacity} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 16 }]}>
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: withOpacity(theme.success, 0.1) }]}>
            <Text variant="heading" style={{ fontSize: 24, color: theme.success }}>📈</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text variant="body" weight="bold">Xếp hạng cơ hội nghiên cứu</Text>
            <Text variant="sm" color="inkMuted">Điểm cơ hội = mức quan tâm × độ khan hiếm công bố</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <View style={styles.list}>
          {gapItems.slice(0, 10).map((g: any, idx: number) => {
            const color = tokenToColor(g.token);
            return (
              <View key={`rank-${g.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text variant="sm" color="inkMuted" style={{ width: 24 }}>{idx + 1}.</Text>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, marginRight: 12 }} />
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text variant="sm" weight="bold">{g.fieldLabel} · {g.aspect}</Text>
                  <Text variant="xs" color="inkMuted">{g.papers} bài · mật độ {Math.round(g.density * 100)}% · quan tâm {Math.round(g.interest * 100)}%</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border }}>
                    <View style={{ height: '100%', borderRadius: 2, backgroundColor: color, width: `${Math.round(g.score * 100)}%` }} />
                  </View>
                  <Text variant="sm" weight="bold">{Math.round(g.score * 100)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
}

function GapDetail({ item, theme, withOpacity }: { item: any, theme: any, withOpacity: any }) {
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const suggest = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const result = await aiApi.suggestDirections({ field: item.fieldLabel, gaps: [item] });
      const first = result.directions[0];
      setAiText(first ? `${first.topic}: ${first.rationale}` : "AI chưa có gợi ý mới cho khoảng trống này.");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Không lấy được gợi ý AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const isGapCell = item.gap || item.density <= 0.35;

  return (
    <View style={[styles.detailContainer, { backgroundColor: theme.surface2 }]}>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricBox, { backgroundColor: theme.surface }]}>
          <Text variant="heading" weight="bold">{item.papers}</Text>
          <Text variant="xs" color="inkMuted">Công bố</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.surface }]}>
          <Text variant="heading" weight="bold">{Math.round(item.density * 100)}%</Text>
          <Text variant="xs" color="inkMuted">Mật độ</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: theme.surface }]}>
          <Text variant="heading" weight="bold">{Math.round(item.interest * 100)}%</Text>
          <Text variant="xs" color="inkMuted">Quan tâm</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: isGapCell ? withOpacity(theme.primary, 0.1) : theme.surface }]}>
          <Text variant="heading" weight="bold" style={{ color: isGapCell ? theme.primary : theme.ink }}>{Math.round(item.score * 100)}</Text>
          <Text variant="xs" color="inkMuted">Điểm cơ hội</Text>
        </View>
      </View>

      {item.keywords && item.keywords.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Từ khóa liên quan</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {item.keywords.map((k: string) => (
              <View key={k} style={[styles.tag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text variant="xs" color="inkMuted">{k}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.evidence && item.evidence.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Paper đại diện trong corpus</Text>
          {item.evidence.map((p: any) => (
            <Text key={p.id || p.title} variant="xs" style={{ marginBottom: 4 }}>
              • {p.title} {p.year ? `(${p.year})` : ""} {typeof p.citations === "number" ? `· ${p.citations} citations` : ""}
            </Text>
          ))}
        </View>
      )}

      <View style={{ marginTop: 16 }}>
        <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Gợi ý hướng nghiên cứu</Text>
        <Text variant="sm" style={{ marginBottom: 8 }}>{item.direction}</Text>
        
        <TouchableOpacity 
          style={[styles.btnOutline, { borderColor: theme.primary }]} 
          onPress={suggest} 
          disabled={aiLoading}
        >
          <Text variant="sm" weight="bold" style={{ color: theme.primary }}>
            {aiLoading ? "Đang hỏi AI..." : "✨ AI gợi ý thêm"}
          </Text>
        </TouchableOpacity>
        
        {aiError ? <Text variant="sm" color="danger" style={{ marginTop: 8 }}>{aiError}</Text> : null}
        {aiText ? (
          <View style={[styles.aiResponse, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="sm">{aiText}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  filterCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },

  summaryStrip: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryBox: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  aiBox: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1 },
  list: { paddingHorizontal: 0 }, // full bleed list
  
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  rank: { width: 20, textAlign: 'center' },
  itemContent: { flex: 1, paddingHorizontal: 10 },
  
  progressContainer: { width: 130, marginRight: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  
  detailContainer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricBox: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  btnOutline: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  aiResponse: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' }
});

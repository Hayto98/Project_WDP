import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../components/Text';
import { useTheme } from '../../../context/ThemeContext';
import { IconChevron, IconExternal, IconBookmark } from '../../../components/icons';
import { paperApi, aiApi, libraryApi, PaperResult } from '../../../lib/api';

export default function PaperDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();

  const [paper, setPaper] = useState<PaperResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [aiSummary, setAiSummary] = useState<{ text?: string; loading?: boolean; error?: string }>({});
  const [relatedPapers, setRelatedPapers] = useState<{ loading?: boolean; papers?: PaperResult[]; error?: string }>({});

  useEffect(() => {
    if (id) {
      loadPaper(id as string);
      checkSaved(id as string);
    }
  }, [id]);

  const loadPaper = async (paperId: string) => {
    setLoading(true);
    try {
      const data = await paperApi.getById(paperId);
      setPaper(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkSaved = async (paperId: string) => {
    try {
      const entries = await libraryApi.papers();
      if (entries.some(e => e.paperId === paperId)) {
        setSaved(true);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleSave = async () => {
    if (!paper || saved) return;
    try {
      const cols = await libraryApi.collections();
      let defaultCol = cols.find(c => c.name === "Đọc sau");
      if (!defaultCol) {
        const created = await libraryApi.createCollection("Đọc sau", "Bài lưu nhanh");
        defaultCol = { id: created._id || created.id || "", name: "Đọc sau", description: "" };
      }
      await libraryApi.savePaper(paper.id, [defaultCol.id]);
      setSaved(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarize = async () => {
    if (!paper) return;
    setAiSummary({ loading: true });
    try {
      const res = await aiApi.summarize({ 
        title: paper.title, 
        abstract: paper.abstract, 
        year: paper.year, 
        source: paper.source, 
        keywords: paper.keywords 
      });
      setAiSummary({ text: res.summary });
    } catch (err: any) {
      setAiSummary({ error: err.message || "Không thể tóm tắt" });
    }
  };

  const handleRelatedPapers = async () => {
    if (!paper) return;
    setRelatedPapers({ loading: true });
    try {
      const res = await aiApi.relatedPapers({ 
        paperId: paper.id,
        title: paper.title, 
        keywords: paper.keywords,
        fields: paper.fields
      });
      setRelatedPapers({ papers: res });
    } catch (err: any) {
      setRelatedPapers({ error: err.message || "Không thể tìm paper liên quan" });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconChevron color={theme.ink} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!paper) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconChevron color={theme.ink} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text variant="title" color="inkMuted">Không tìm thấy bài báo</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconChevron color={theme.ink} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
        <Text variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
          Chi tiết bài báo
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.metaTop}>
          <Text variant="xs" color="inkMuted">{paper.source}</Text>
          <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 8 }}>·</Text>
          <Text variant="xs" color="inkMuted">{paper.year}</Text>
          {!!paper.type && (
            <>
              <Text variant="xs" color="inkMuted" style={{ marginHorizontal: 8 }}>·</Text>
              <View style={{ backgroundColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 }}>
                <Text variant="xs" style={{ color: '#475569', fontSize: 11 }}>{paper.type}</Text>
              </View>
            </>
          )}
        </View>

        <Text variant="heading" weight="bold" color="primary" style={{ marginTop: 8 }}>
          {paper.title}
        </Text>

        <Text variant="sm" color="inkMuted" style={{ marginTop: 8 }}>
          {paper.authors.join(", ")}
        </Text>

        <View style={styles.actionButtons}>
          {!!paper.url && (
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: theme.primary }]}
              onPress={() => Linking.openURL(paper.url)}
            >
              <IconExternal color={theme.surface} size={16} />
              <Text variant="sm" color="surface" weight="bold" style={{ marginLeft: 6 }}>Mở tại nguồn</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={handleSummarize}
          >
            <Text variant="sm" weight="bold">AI tóm tắt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={handleRelatedPapers}
          >
            <Text variant="sm" weight="bold">Paper liên quan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
            onPress={handleSave}
            disabled={saved}
          >
            <IconBookmark color={saved ? theme.primary : theme.ink} size={16} />
            <Text variant="sm" weight="bold" color={saved ? 'primary' : 'ink'} style={{ marginLeft: 6 }}>
              {saved ? 'Đã lưu' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>

        {aiSummary.loading && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text variant="sm" color="inkMuted" style={{ marginLeft: 8 }}>AI đang phân tích...</Text>
          </View>
        )}
        
        {aiSummary.text && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text variant="sm" weight="bold" style={{ marginBottom: 4 }}>AI Tóm tắt</Text>
            <Text variant="sm">{aiSummary.text}</Text>
          </View>
        )}

        {aiSummary.error && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text variant="sm" style={{ color: '#dc2626' }}>{aiSummary.error}</Text>
          </View>
        )}

        {relatedPapers.loading && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text variant="sm" color="inkMuted" style={{ marginLeft: 8 }}>Đang tìm paper liên quan...</Text>
          </View>
        )}

        {relatedPapers.error && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text variant="sm" style={{ color: '#dc2626' }}>{relatedPapers.error}</Text>
          </View>
        )}

        {relatedPapers.papers && (
          <View style={[styles.aiBox, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Paper liên quan</Text>
            {relatedPapers.papers.map((rp: PaperResult, i: number) => (
              <TouchableOpacity key={rp.id} style={{ marginTop: i > 0 ? 12 : 0 }} onPress={() => { if (rp.url) Linking.openURL(rp.url); else router.push(`/(user)/paper/${rp.id}` as any); }}>
                <Text variant="sm" weight="bold" color="primary">{rp.title}</Text>
                <Text variant="xs" color="inkMuted" style={{ marginTop: 2 }}>{rp.authors.join(", ")} · {rp.year}</Text>
              </TouchableOpacity>
            ))}
            {relatedPapers.papers.length === 0 && <Text variant="sm" color="inkMuted">Không tìm thấy paper liên quan.</Text>}
          </View>
        )}

        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text variant="lead" weight="bold" style={{ marginBottom: 8 }}>Tóm tắt (Abstract)</Text>
          <Text variant="body" style={{ lineHeight: 24 }}>
            {paper.abstract || "Không có tóm tắt cho bài báo này."}
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow label="Lượt trích dẫn" value={paper.citations} />
          <InfoRow label="Lĩnh vực" value={paper.fields.join(", ") || "Chưa phân loại"} />
          <InfoRow label="Từ khóa" value={paper.keywords.join(", ") || "Chưa có từ khóa"} />
          {!!paper.doi && <InfoRow label="DOI" value={paper.doi} isLink />}
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, isLink = false }: { label: string; value: string | number; isLink?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text variant="xs" color="inkMuted" style={{ width: 100 }}>{label}</Text>
      {isLink ? (
        <Text variant="sm" color="primary" style={{ flex: 1 }} onPress={() => Linking.openURL(`https://doi.org/${value}`)}>
          {value}
        </Text>
      ) : (
        <Text variant="sm" style={{ flex: 1 }}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  content: {
    padding: 20,
  },
  metaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  aiBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  section: {
    paddingTop: 24,
    borderTopWidth: 1,
    marginBottom: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  }
});

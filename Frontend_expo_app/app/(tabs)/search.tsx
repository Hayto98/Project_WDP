import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSearch, IconX, IconFilter, IconPlus, IconQuote, IconBookmark, IconExternal, IconChevron } from '../../components/icons';
import { formatInt } from '../../lib/format';
import { paperApi, aiApi, libraryApi } from '../../lib/api';
import type { PaperResult } from '../../lib/api';

const SOURCES = [
  "OpenAlex",
  "Semantic Scholar",
  "Crossref",
  "arXiv",
  "IEEE Xplore",
  "ACM Digital Library",
];

const FIELDS = [
  "Large Language Models",
  "Computer Vision",
  "Federated Learning",
  "Graph Neural Networks",
  "Quantum Machine Learning",
  "Edge & TinyML",
];

const TYPES: string[] = ["Journal", "Conference", "Preprint"];

const RELATED_KEYWORDS = [
  "mixture of experts",
  "retrieval-augmented generation",
  "parameter-efficient fine-tuning",
  "differential privacy",
  "knowledge distillation",
  "contrastive learning",
];

const YEAR_MIN = 2015;
const YEAR_MAX = 2025;
const PAGE_SIZE = 5;

type Scope = "all" | "title" | "author";
type SortKey = "relevance" | "year_desc" | "year_asc" | "citations";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "title", label: "Tiêu đề" },
  { id: "author", label: "Tác giả" },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sort, setSort] = useState<SortKey>("relevance");
  const [andTerms, setAndTerms] = useState("");
  const [orTerms, setOrTerms] = useState("");
  const [notTerms, setNotTerms] = useState("");
  
  // Filters
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [aiSummaries, setAiSummaries] = useState<Record<string, { loading?: boolean; text?: string; error?: string }>>({});
  const [relatedPapers, setRelatedPapers] = useState<Record<string, { loading?: boolean; papers?: PaperResult[]; error?: string }>>({});
  
  const [remoteResults, setRemoteResults] = useState<PaperResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);

  const runSearch = (q: string) => {
    setSubmitted(q);
    setHasSearched(true);
    setPage(1);
  };

  useEffect(() => {
    if (!hasSearched) return;
    setLoading(true);
    
    paperApi.search({
      q: submitted,
      scope,
      andTerms,
      orTerms,
      notTerms,
      sources: [...sources].join(","),
      types: [...types].join(","),
      sort,
      yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
      yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
      page: page,
      limit: PAGE_SIZE,
    }).then(({ papers, meta }) => {
      setRemoteResults(papers);
      setTotalResults(meta?.total ?? papers.length);
    }).catch((err) => {
      console.error(err);
      setRemoteResults([]);
    }).finally(() => {
      setLoading(false);
    });
  }, [submitted, hasSearched, scope, fields, sources, types, page, sort, yearFrom, yearTo, andTerms, orTerms, notTerms]);

  const results = remoteResults;

  const activeFilterCount = fields.size + sources.size + types.size;

  const toggleSet = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    apply(next);
    setPage(1);
  };

  const clearFilters = () => {
    setFields(new Set());
    setSources(new Set());
    setTypes(new Set());
    setYearFrom("");
    setYearTo("");
    setSort("relevance");
    setAndTerms("");
    setOrTerms("");
    setNotTerms("");
    setPage(1);
  };

  const ensureSaveCollection = async () => {
    const cols = await libraryApi.collections();
    let defaultCol = cols.find(c => c.name === "Đọc sau");
    if (!defaultCol) {
      const created = await libraryApi.createCollection("Đọc sau", "Bài lưu nhanh từ trang tìm kiếm");
      defaultCol = { id: created._id || created.id || "", name: "Đọc sau", description: "" };
    }
    return defaultCol.id;
  };

  const savePaperToLibrary = async (p: PaperResult) => {
    if (saved.has(p.id)) return;
    try {
      const colId = await ensureSaveCollection();
      await libraryApi.savePaper(p.id, [colId]);
      setSaved(prev => new Set(prev).add(p.id));
      Alert.alert("Thành công", "Đã lưu bài báo vào thư viện.");
    } catch (err: any) {
      Alert.alert("Lỗi", err.message || "Không thể lưu bài báo");
    }
  };

  const handleSaveSearch = async () => {
    try {
      await paperApi.saveSearch(submitted, {
        scope, andTerms, orTerms, notTerms,
        sources: [...sources].join(","), types: [...types].join(","),
        yearFrom, yearTo, sort
      });
      Alert.alert("Thành công", "Đã lưu tìm kiếm!");
    } catch (err: any) {
      Alert.alert("Lỗi", err.message);
    }
  };

  const handleSummarize = async (p: PaperResult) => {
    if (aiSummaries[p.id]?.loading) return;
    setAiSummaries(prev => ({ ...prev, [p.id]: { loading: true } }));
    try {
      const result = await aiApi.summarize({
        title: p.title,
        abstract: p.abstract,
        year: p.year,
        source: p.source,
        keywords: p.keywords
      });
      setAiSummaries(prev => ({ ...prev, [p.id]: { loading: false, text: result.summary } }));
    } catch (err: any) {
      setAiSummaries(prev => ({ ...prev, [p.id]: { loading: false, error: err.message } }));
    }
  };

  const handleRelatedPapers = async (p: PaperResult) => {
    if (relatedPapers[p.id]?.loading) return;
    setRelatedPapers(prev => ({ ...prev, [p.id]: { loading: true } }));
    try {
      const papers = await aiApi.relatedPapers({
        paperId: p.id,
        title: p.title,
        keywords: p.keywords,
        fields: p.fields,
        limit: 3
      });
      setRelatedPapers(prev => ({ ...prev, [p.id]: { loading: false, papers } }));
    } catch (err: any) {
      setRelatedPapers(prev => ({ ...prev, [p.id]: { loading: false, error: err.message } }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="heading" weight="bold">Tìm kiếm</Text>
          <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
            Tra cứu bài báo theo từ khóa, tác giả, lĩnh vực
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <IconSearch color={theme.inkMuted} size={20} />
          <TextInput
            style={[styles.searchInput, { color: theme.ink }]}
            placeholder="Từ khóa, tiêu đề..."
            placeholderTextColor={theme.inkMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <IconX color={theme.inkMuted} size={16} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.scopes}>
          {SCOPES.map(s => (
            <TouchableOpacity 
              key={s.id} 
              style={[styles.scopeBtn, scope === s.id && { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 }]}
              onPress={() => { setScope(s.id); setPage(1); }}
            >
              <Text variant="xs" color={scope === s.id ? 'surface' : 'inkMuted'} weight={scope === s.id ? 'bold' : 'normal'}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!hasSearched ? (
        <ScrollView style={{ padding: 16 }}>
          <View style={[styles.emptyState, { backgroundColor: theme.surface2 }]}>
            <IconSearch color={theme.primary} size={32} />
            <Text variant="title" weight="bold" style={{ marginTop: 16, marginBottom: 8 }}>Bắt đầu khám phá</Text>
            <Text variant="sm" color="inkMuted" style={{ textAlign: 'center', paddingHorizontal: 24 }}>
              Nhập từ khóa, tên tác giả hoặc chọn nhanh một lĩnh vực bên dưới.
            </Text>
          </View>
          
          <Text variant="sm" weight="bold" style={{ marginTop: 24, marginBottom: 12 }}>Gợi ý tìm kiếm</Text>
          <View style={styles.chipRow}>
            {RELATED_KEYWORDS.map(k => (
              <TouchableOpacity 
                key={k} 
                style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => { setQuery(k); runSearch(k); }}
              >
                <Text variant="sm">{k}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <>
          <View style={[styles.filterBar, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="sm" weight="bold">{formatInt(totalResults)} kết quả</Text>
              <TouchableOpacity onPress={handleSaveSearch} style={{ marginLeft: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.primaryWeak, borderRadius: 4 }}>
                <Text variant="xs" color="primary" weight="bold">Lưu tìm kiếm</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setFacetsOpen(true)}>
              <IconFilter color={theme.ink} size={16} />
              <Text variant="sm" style={{ marginLeft: 6 }}>Bộ lọc</Text>
              {activeFilterCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text variant="xs" color="surface" weight="bold">{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsList} contentContainerStyle={{ padding: 16 }}>
            {results.map(p => {
              const isSaved = saved.has(p.id);
              return (
                <TouchableOpacity 
                  key={p.id}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/(user)/paper/${p.id}` as any)}
                  style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text variant="lead" weight="bold" color="primary">{p.title}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <Text variant="xs" color="inkMuted">
                      {p.authors.join(", ")} · {p.year} · {p.source}
                    </Text>
                    {!!p.type && (
                      <View style={{ backgroundColor: '#ffedd5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginLeft: 6 }}>
                        <Text variant="xs" style={{ color: '#c2410c', fontSize: 11, fontWeight: 'bold' }}>{p.type}</Text>
                      </View>
                    )}
                  </View>

                  {(!!p.doi || !!p.url) && (
                    <Text variant="xs" style={{ color: '#0d9488', marginTop: 4 }}>
                      DOI/Link: {p.doi || p.url}
                    </Text>
                  )}
                  
                  <Text variant="sm" style={{ marginTop: 8 }} numberOfLines={3}>
                    {p.abstract}
                  </Text>

                  <View style={styles.tags}>
                    {p.keywords.slice(0, 3).map(k => (
                      <View key={k} style={[styles.tag, { backgroundColor: theme.surface2 }]}>
                        <Text variant="xs" color="inkMuted">{k}</Text>
                      </View>
                    ))}
                    {p.keywords.length > 3 && (
                      <View style={[styles.tag, { backgroundColor: theme.surface2 }]}>
                        <Text variant="xs" color="inkMuted">+{p.keywords.length - 3}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actions}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconQuote color={theme.inkMuted} size={14} />
                      <Text variant="sm" weight="bold" style={{ marginLeft: 4 }}>{formatInt(p.citations)} trích dẫn</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, isSaved && { backgroundColor: theme.primaryWeak }]}
                        onPress={() => savePaperToLibrary(p)}
                      >
                        <IconBookmark color={isSaved ? theme.primary : theme.inkMuted} size={14} />
                        <Text variant="xs" color={isSaved ? 'primary' : 'inkMuted'} style={{ marginLeft: 4 }}>
                          {isSaved ? 'Đã lưu' : 'Lưu'}
                        </Text>
                      </TouchableOpacity>
                      
                      <View style={[styles.actionBtn, { marginLeft: 8 }]}>
                        <IconSearch color={theme.inkMuted} size={14} />
                        <Text variant="xs" color="inkMuted" style={{ marginLeft: 4 }}>Chi tiết</Text>
                      </View>

                      {!!p.url && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, { marginLeft: 8 }]}
                          onPress={() => Linking.openURL(p.url)}
                        >
                          <IconExternal color={theme.inkMuted} size={14} />
                          <Text variant="xs" color="inkMuted" style={{ marginLeft: 4 }}>Nguồn</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {results.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: theme.surface2 }]}>
                <Text variant="title" weight="bold">Không tìm thấy</Text>
                <Text variant="sm" color="inkMuted" style={{ marginTop: 8 }}>Thử đổi từ khóa hoặc xóa bớt bộ lọc</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={clearFilters} style={{ marginTop: 16 }}>
                    <Text color="primary">Xóa bộ lọc</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {results.length > 0 && totalResults > PAGE_SIZE && (
              <View style={styles.pagination}>
                <TouchableOpacity 
                  style={[styles.pageBtnText, page === 1 && { opacity: 0.5, borderColor: theme.border }]} 
                  disabled={page === 1}
                  onPress={() => setPage(p => Math.max(1, p - 1))}
                >
                  <Text variant="sm">Trước</Text>
                </TouchableOpacity>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
                  {Array.from({ length: Math.ceil(totalResults / PAGE_SIZE) }).map((_, i) => {
                    const p = i + 1;
                    const isActive = p === page;
                    return (
                      <TouchableOpacity 
                        key={p}
                        style={[styles.pageNumberBtn, isActive && { backgroundColor: theme.primary }]}
                        onPress={() => setPage(p)}
                      >
                        <Text variant="sm" color={isActive ? 'surface' : 'ink'} weight={isActive ? 'bold' : 'normal'}>
                          {p}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>

                <TouchableOpacity 
                  style={[styles.pageBtnText, page === Math.ceil(totalResults / PAGE_SIZE) && { opacity: 0.5, borderColor: theme.border }]} 
                  disabled={page === Math.ceil(totalResults / PAGE_SIZE)}
                  onPress={() => setPage(p => Math.min(Math.ceil(totalResults / PAGE_SIZE), p + 1))}
                >
                  <Text variant="sm">Sau</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {/* Filters Modal */}
      <Modal visible={facetsOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setFacetsOpen(false)}>
              <Text color="primary">Đóng</Text>
            </TouchableOpacity>
            <Text variant="lead" weight="bold">Bộ lọc</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text color="danger">Xóa</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={{ padding: 16 }}>
            <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Sắp xếp</Text>
            <View style={styles.chipRow}>
              {(['relevance', 'year_desc', 'year_asc', 'citations'] as const).map(s => {
                const isActive = sort === s;
                const label = s === 'relevance' ? 'Liên quan nhất' : s === 'year_desc' ? 'Mới nhất' : s === 'year_asc' ? 'Cũ nhất' : 'Trích dẫn nhiều';
                return (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.chip, { borderColor: theme.border }, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => { setSort(s); setPage(1); }}
                  >
                    <Text variant="sm" color={isActive ? 'surface' : 'ink'}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text variant="body" weight="bold" style={{ marginTop: 12, marginBottom: 12 }}>Khoảng năm</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                style={[styles.yearInput, { borderColor: theme.border, color: theme.ink }]}
                placeholder="Từ năm"
                keyboardType="numeric"
                value={yearFrom}
                onChangeText={setYearFrom}
              />
              <Text style={{ marginHorizontal: 8, color: theme.ink }}>-</Text>
              <TextInput
                style={[styles.yearInput, { borderColor: theme.border, color: theme.ink }]}
                placeholder="Đến năm"
                keyboardType="numeric"
                value={yearTo}
                onChangeText={setYearTo}
              />
            </View>

            <Text variant="body" weight="bold" style={{ marginTop: 12, marginBottom: 12 }}>Tìm kiếm nâng cao (AND/OR/NOT)</Text>
            <TextInput
              style={[styles.advancedInput, { borderColor: theme.border, color: theme.ink }]}
              placeholder="AND (Bắt buộc chứa, vd: GPT,AI)"
              placeholderTextColor={theme.inkMuted}
              value={andTerms}
              onChangeText={setAndTerms}
            />
            <TextInput
              style={[styles.advancedInput, { borderColor: theme.border, color: theme.ink }]}
              placeholder="OR (Chứa một trong, vd: CNN,RNN)"
              placeholderTextColor={theme.inkMuted}
              value={orTerms}
              onChangeText={setOrTerms}
            />
            <TextInput
              style={[styles.advancedInput, { borderColor: theme.border, color: theme.ink }]}
              placeholder="NOT (Không chứa, vd: survey,review)"
              placeholderTextColor={theme.inkMuted}
              value={notTerms}
              onChangeText={setNotTerms}
            />

            <Text variant="body" weight="bold" style={{ marginTop: 12, marginBottom: 12 }}>Lĩnh vực</Text>
            <View style={styles.chipRow}>
              {FIELDS.map(f => {
                const isActive = fields.has(f);
                return (
                  <TouchableOpacity 
                    key={f} 
                    style={[styles.chip, { borderColor: theme.border }, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => toggleSet(fields, f, setFields)}
                  >
                    <Text variant="sm" color={isActive ? 'surface' : 'ink'}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text variant="body" weight="bold" style={{ marginTop: 24, marginBottom: 12 }}>Nguồn</Text>
            <View style={styles.chipRow}>
              {SOURCES.map(s => {
                const isActive = sources.has(s);
                return (
                  <TouchableOpacity 
                    key={s} 
                    style={[styles.chip, { borderColor: theme.border }, isActive && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => toggleSet(sources, s, setSources)}
                  >
                    <Text variant="sm" color={isActive ? 'surface' : 'ink'}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  scopes: {
    flexDirection: 'row',
    marginTop: 12,
  },
  scopeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginTop: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  resultsList: {
    flex: 1,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  pageBtnText: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  pageNumberBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  yearInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
  },
  advancedInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  expandedDetails: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  miniBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 8,
  }
});

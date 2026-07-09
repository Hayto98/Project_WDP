import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { ThemeToggle } from '../../components/ThemeToggle';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSearch, IconX, IconFilter, IconPlus, IconQuote, IconBookmark, IconExternal, IconChevron } from '../../components/icons';
import { formatInt } from '../../lib/format';
import { FIELDS, PAPERS, RELATED_KEYWORDS, SOURCES, TYPES, type PaperResult } from '../../data/searchSample';

const YEAR_MIN = 2015;
const YEAR_MAX = 2025;
const PAGE_SIZE = 5;

type Scope = "all" | "title" | "author";
type SortKey = "relevance" | "year" | "citations";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "title", label: "Tiêu đề" },
  { id: "author", label: "Tác giả" },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [facetsOpen, setFacetsOpen] = useState(false);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  
  const runSearch = (q: string) => {
    setSubmitted(q);
    setHasSearched(true);
    setLoading(true);
    setTimeout(() => setLoading(false), 480);
  };

  const results = useMemo(() => {
    if (!hasSearched) return [];
    const q = submitted.toLowerCase().trim();
    
    return PAPERS.filter(p => {
      if (fields.size && !p.fields.some(f => fields.has(f))) return false;
      if (sources.size && !sources.has(p.source)) return false;
      if (types.size && !types.has(p.type)) return false;
      
      if (!q) return true;
      
      const hay = [p.title, p.authors.join(" "), p.abstract].join(" ").toLowerCase();
      if (scope === 'title') return p.title.toLowerCase().includes(q);
      if (scope === 'author') return p.authors.join(" ").toLowerCase().includes(q);
      return hay.includes(q);
    });
  }, [submitted, hasSearched, scope, fields, sources, types]);

  const activeFilterCount = fields.size + sources.size + types.size;

  const toggleSet = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    apply(next);
  };

  const clearFilters = () => {
    setFields(new Set());
    setSources(new Set());
    setTypes(new Set());
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
              style={[styles.scopeBtn, scope === s.id && { backgroundColor: theme.primaryWeak }]}
              onPress={() => setScope(s.id)}
            >
              <Text variant="xs" color={scope === s.id ? 'primaryInk' : 'inkMuted'} weight={scope === s.id ? 'bold' : 'normal'}>
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
            <Text variant="sm" weight="bold">{formatInt(results.length)} kết quả</Text>
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
                <View key={p.id} style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text variant="lead" weight="bold" color="primaryInk">{p.title}</Text>
                  
                  <Text variant="xs" color="inkMuted" style={{ marginTop: 6 }}>
                    {p.authors.join(", ")} · {p.year} · {p.source}
                  </Text>
                  
                  <Text variant="sm" style={{ marginTop: 8 }} numberOfLines={3}>
                    {p.abstract}
                  </Text>

                  <View style={styles.tags}>
                    {p.keywords.slice(0, 3).map(k => (
                      <View key={k} style={[styles.tag, { backgroundColor: theme.surface2 }]}>
                        <Text variant="xs" color="inkMuted">{k}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.actions}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconQuote color={theme.inkMuted} size={14} />
                      <Text variant="sm" weight="bold" style={{ marginLeft: 4 }}>{formatInt(p.citations)} trích dẫn</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, isSaved && { backgroundColor: theme.primaryWeak }]}
                        onPress={() => toggleSet(saved, p.id, setSaved)}
                      >
                        <IconBookmark color={isSaved ? theme.primary : theme.inkMuted} size={14} />
                        <Text variant="xs" color={isSaved ? 'primary' : 'inkMuted'} style={{ marginLeft: 4 }}>
                          {isSaved ? 'Đã lưu' : 'Lưu'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
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
            <Text variant="body" weight="bold" style={{ marginBottom: 12 }}>Lĩnh vực</Text>
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
    borderRadius: 12,
    marginTop: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  }
});

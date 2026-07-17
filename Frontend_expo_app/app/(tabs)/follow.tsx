import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking, Modal, TouchableWithoutFeedback } from 'react-native';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBell, IconChevron, IconPlus, IconSearch, IconBookmark, IconExternal, IconQuote, IconEdit } from '../../components/icons';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';

import { KpiStrip } from '../../components/KpiStrip';
import { Widget } from '../../components/Widget';
import { followApi, libraryApi, aiApi } from '../../lib/api';
import type { FollowSubject, FollowAlert, PaperResult } from '../../lib/api';
import { formatInt } from '../../lib/format';
import type { Kpi } from '../../data/types';

export interface FollowAlertEntry extends FollowAlert {
  subject: FollowSubject;
  paper: PaperResult;
}

type FeedFilter = 'all' | 'unread' | 'high';

export default function FollowScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [subjects, setSubjects] = useState<FollowSubject[]>([]);
  const [alerts, setAlerts] = useState<FollowAlert[]>([]);
  const [activeId, setActiveId] = useState('all');
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubjectText, setNewSubjectText] = useState('');
  const [subjectSettingsOpen, setSubjectSettingsOpen] = useState(false);

  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [aiSummaries, setAiSummaries] = useState<Record<string, { loading?: boolean; text?: string; error?: string }>>({});
  const [relatedPapers, setRelatedPapers] = useState<Record<string, { loading?: boolean; papers?: PaperResult[]; error?: string }>>({});

  const toggleSet = (set: Set<string>, id: string, setFn: (val: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFn(next);
  };

  const ensureSaveCollection = async () => {
    const cols = await libraryApi.collections();
    let defaultCol = cols.find(c => c.name === "Đọc sau");
    if (!defaultCol) {
      const created = await libraryApi.createCollection("Đọc sau", "Bài lưu nhanh từ mục theo dõi");
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nextSubjects, nextAlerts] = await Promise.all([
        followApi.subjects(),
        followApi.alerts(),
      ]);
      setSubjects(nextSubjects);
      setAlerts(nextAlerts);
      if (nextSubjects.length > 0) setActiveId('all');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const entries = useMemo<FollowAlertEntry[]>(() => {
    return alerts.map(alert => {
      const subject = subjects.find(s => s.id === alert.subjectId) || {
        id: alert.subjectId,
        label: 'Mục theo dõi chung',
        type: 'keyword',
        active: true,
        newPapers: 0,
        papers7d: 0,
        rule: { frequency: 'daily', threshold: 'all', email: false, inApp: true, exclude: [] }
      };
      const paper = alert.paper || {
        id: alert.paperId,
        title: 'Untitled Paper',
        authors: [],
        year: new Date().getFullYear(),
        source: 'Unknown',
        type: 'Preprint',
        fields: [],
        keywords: [],
        abstract: '',
        citations: 0,
        doi: '',
        url: '#'
      };
      return { ...alert, subject, paper } as FollowAlertEntry;
    });
  }, [subjects, alerts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = entries.filter((entry) => {
      const hay = [
        entry.subject.label,
        entry.paper.title,
        entry.paper.authors.join(' '),
        entry.paper.source,
        entry.reason,
      ].join(' ').toLowerCase();

      if (activeId !== 'all' && entry.subjectId !== activeId) return false;
      if (filter === 'unread' && !entry.unread) return false;
      if (filter === 'high' && entry.priority !== 'high') return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });

    // Sort newest first based on original alerts order
    rows.sort((a, b) => {
      return alerts.findIndex(x => x.id === a.id) - alerts.findIndex(x => x.id === b.id);
    });
    return rows;
  }, [entries, activeId, filter, query, alerts]);

  const unreadCount = alerts.filter(a => a.unread).length;
  const activeCount = subjects.filter(s => s.active).length;
  const highCount = alerts.filter(a => a.priority === 'high').length;

  const kpis: Kpi[] = [
    { id: '1', label: 'Đang bật', value: activeCount, format: 'int', hint: '' },
    { id: '2', label: 'Chưa đọc', value: unreadCount, format: 'int', deltaKind: unreadCount > 0 ? 'up' : 'neutral', hint: unreadCount > 0 ? 'Có thông báo mới' : 'Đã xem hết' },
    { id: '3', label: 'Ưu tiên cao', value: highCount, format: 'int', hint: '' },
    { id: '4', label: '7 ngày qua', value: entries.length, format: 'int', hint: '' },
  ];

  const handleAdd = () => {
    setMenuOpen(false);
    setNewSubjectText('');
    setAddSubjectOpen(true);
  };

  const submitAddSubject = async () => {
    if (!newSubjectText.trim()) return;
    try {
      const added = await followApi.addSubject({ type: 'keyword', value: newSubjectText.trim() });
      setSubjects(curr => [...curr, added]);
      setAddSubjectOpen(false);
      setNewSubjectText('');
      setActiveId(added.id); // switch to the new subject immediately
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể thêm chủ đề mới');
    }
  };

  const handleUpdateSubject = async (active: boolean) => {
    if (activeId === 'all') return;
    try {
      await followApi.updateSubject(activeId, { active });
      setSubjects(curr => curr.map(s => s.id === activeId ? { ...s, active } : s));
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const handleDeleteSubject = () => {
    if (activeId === 'all') return;
    Alert.alert("Xóa mục theo dõi", "Bạn có chắc chắn muốn xóa?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
        try {
          await followApi.removeSubject(activeId);
          setSubjects(curr => curr.filter(s => s.id !== activeId));
          setSubjectSettingsOpen(false);
          setActiveId('all');
        } catch (e) {
          Alert.alert('Lỗi', 'Không thể xóa chủ đề');
        }
      }}
    ]);
  };

  const markRead = async (id: string) => {
    setAlerts(curr => curr.map(a => a.id === id ? { ...a, unread: false } : a));
    try {
      await followApi.markAlertRead(id);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          {/* using IconChevron rotated for back button, or a custom IconArrowLeft */}
          <IconChevron color={theme.ink} size={24} style={{ transform: [{ rotate: '90deg' }] }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text variant="heading" weight="bold">Theo dõi</Text>
          <Text variant="xs" color="inkMuted" numberOfLines={1}>Quản lý chủ đề và luồng bài mới</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <View style={{ marginBottom: 16 }}>
          <KpiStrip kpis={kpis} loading={loading} />
        </View>

        {/* Subjects List */}
        <View style={{ marginBottom: 24, zIndex: 10 }}>
          <Text variant="sm" weight="bold" style={{ marginBottom: 12 }}>Mục theo dõi</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.subjectChip, { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, justifyContent: 'space-between' }]}
              onPress={() => setMenuOpen(true)}
            >
              <Text variant="sm" weight="bold" color="ink" numberOfLines={1} style={{ flex: 1 }}>
                {activeId === 'all' ? 'Tất cả' : subjects.find(s => s.id === activeId)?.label || 'Chọn mục theo dõi'}
              </Text>
              <IconChevron color={theme.inkMuted} size={16} style={{ transform: [{ rotate: '90deg' }] }} />
            </TouchableOpacity>

            {activeId !== 'all' && (
              <TouchableOpacity 
                style={{ marginLeft: 8, padding: 12, backgroundColor: theme.surface, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}
                onPress={() => setSubjectSettingsOpen(true)}
              >
                <IconEdit size={18} color={subjects.find(s => s.id === activeId)?.active ? theme.primary : theme.inkMuted} />
              </TouchableOpacity>
            )}
          </View>

          <Modal visible={menuOpen} transparent={true} animationType="fade">
            <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16, maxHeight: '70%' }}>
                    <Text variant="lead" weight="bold" style={{ marginBottom: 16 }}>Chọn mục theo dõi</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <TouchableOpacity 
                        style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                        onPress={() => { setActiveId('all'); setMenuOpen(false); }}
                      >
                        <Text variant="sm" weight={activeId === 'all' ? 'bold' : 'normal'} color={activeId === 'all' ? 'primary' : 'ink'}>Tất cả</Text>
                      </TouchableOpacity>
                      {subjects.map(sub => (
                        <TouchableOpacity 
                          key={sub.id} 
                          style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                          onPress={() => { setActiveId(sub.id); setMenuOpen(false); }}
                        >
                          <Text variant="sm" weight={activeId === sub.id ? 'bold' : 'normal'} color={activeId === sub.id ? 'primary' : 'ink'}>{sub.label}</Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity 
                        style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                        onPress={handleAdd}
                      >
                        <IconPlus size={16} color={theme.primary} />
                        <Text variant="sm" color="primary" weight="bold" style={{ marginLeft: 8 }}>Thêm chủ đề mới</Text>
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <Modal visible={addSubjectOpen} transparent={true} animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 16 }}>
                <Text variant="lead" weight="bold" style={{ marginBottom: 16 }}>Thêm chủ đề mới</Text>
                <TextInput 
                  style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 12, fontSize: 14, color: theme.ink, marginBottom: 16 }}
                  placeholder="Nhập tên chủ đề hoặc từ khóa..."
                  placeholderTextColor={theme.inkMuted}
                  value={newSubjectText}
                  onChangeText={setNewSubjectText}
                  autoFocus={true}
                  onSubmitEditing={submitAddSubject}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity 
                    style={{ paddingVertical: 8, paddingHorizontal: 16, marginRight: 8 }}
                    onPress={() => setAddSubjectOpen(false)}
                  >
                    <Text variant="sm" color="inkMuted">Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }}
                    onPress={submitAddSubject}
                  >
                    <Text variant="sm" color="surface" weight="bold">Thêm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal visible={subjectSettingsOpen} transparent={true} animationType="fade">
            <TouchableWithoutFeedback onPress={() => setSubjectSettingsOpen(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: theme.surface, borderRadius: 12, padding: 20 }}>
                    <Text variant="lead" weight="bold" style={{ marginBottom: 8 }}>{subjects.find(s => s.id === activeId)?.label}</Text>
                    <Text variant="sm" color="inkMuted" style={{ marginBottom: 24 }}>Quản lý chủ đề theo dõi</Text>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                      <Text variant="sm" weight="bold">Nhận thông báo</Text>
                      <TouchableOpacity 
                        onPress={() => handleUpdateSubject(!subjects.find(s => s.id === activeId)?.active)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: subjects.find(s => s.id === activeId)?.active ? theme.primary : theme.surface2 }}
                      >
                        <Text variant="sm" color={subjects.find(s => s.id === activeId)?.active ? "surface" : "inkMuted"} weight="bold">
                          {subjects.find(s => s.id === activeId)?.active ? "Đang bật" : "Tạm dừng"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: '#ef444420', borderRadius: 8 }}
                      onPress={handleDeleteSubject}
                    >
                      <Text variant="sm" weight="bold" style={{ color: '#ef4444' }}>Xóa theo dõi</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>

        {/* Feed section */}
        <Widget title="Tất cả thông báo" subtitle={`${filtered.length} thông báo khớp bộ lọc`} status="ready">
          
          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, { backgroundColor: theme.surface2 }]}>
              <TouchableOpacity style={[styles.filterBtn, filter === 'all' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('all')}>
                <Text variant="xs" weight={filter === 'all' ? 'bold' : 'normal'}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'unread' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('unread')}>
                <Text variant="xs" weight={filter === 'unread' ? 'bold' : 'normal'}>Chưa đọc</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, filter === 'high' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]} onPress={() => setFilter('high')}>
                <Text variant="xs" weight={filter === 'high' ? 'bold' : 'normal'}>Ưu tiên</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <IconSearch color={theme.inkMuted} size={18} />
            <TextInput 
              style={[styles.searchInput, { color: theme.ink }]} 
              placeholder="Tìm bài báo, tác giả..." 
              placeholderTextColor={theme.inkMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={theme.primary} />
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <IconBell color={theme.inkMuted} size={32} />
              <Text variant="body" color="inkMuted" style={{ marginTop: 12, textAlign: 'center' }}>Không có thông báo nào khớp.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              {filtered.map(entry => {
                const p = entry.paper;
                const isSaved = saved.has(p.id);
                const isExpanded = expandedCards.has(p.id);
                
                return (
                  <TouchableOpacity 
                    key={entry.id} 
                    activeOpacity={0.9}
                    onPress={() => { 
                      if (entry.unread) markRead(entry.id); 
                      router.push(`/(user)/paper/${p.id}` as any); 
                    }}
                    style={[
                      styles.alertCard, 
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      entry.unread && { borderLeftWidth: 3, borderLeftColor: theme.primary }
                    ]}
                  >
                    <View style={[styles.alertHeader, { marginBottom: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, paddingRight: 8 }}>
                        <Text variant="xs" color="primary" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{entry.subject.label || 'Thông báo'}</Text>
                        {entry.priority === 'high' && (
                          <View style={[styles.badge, { backgroundColor: theme.danger, marginLeft: 8, flexShrink: 0 }]}>
                            <Text variant="xs" color="surface" weight="bold" numberOfLines={1}>Cao</Text>
                          </View>
                        )}
                      </View>
                      <Text variant="xs" color="inkMuted" numberOfLines={1} style={{ flexShrink: 1, flex: 1, textAlign: 'right', marginLeft: 12 }}>{entry.reason}</Text>
                    </View>
                    
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
                      {p.keywords.slice(0, 3).map((k: string) => (
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
            </View>
          )}
          
        </Widget>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  scroll: {
    padding: 16,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  searchBox: {
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
    fontSize: 14,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
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
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  }
});

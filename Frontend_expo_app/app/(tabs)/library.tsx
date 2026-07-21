import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, TouchableOpacity, Modal, Alert, Linking, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeToggle } from '../../components/ThemeToggle';
import { IconBookmark, IconSearch, IconX, IconExternal, IconPlus } from '../../components/icons';
import { libraryApi } from '../../lib/api';
import type { LibraryCollection, LibraryEntry } from '../../lib/api';
import { useFocusEffect } from 'expo-router';

type StatusFilter = "all" | "unread" | "reading" | "done";

const STATUS_LABEL: Record<string, string> = {
  unread: "Chưa đọc",
  reading: "Đang đọc",
  done: "Đã đọc",
};

export default function LibraryScreen() {
  const { theme } = useTheme();
  
  const [items, setItems] = useState<LibraryEntry[]>([]);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedPaper, setSelectedPaper] = useState<LibraryEntry | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editCollectionName, setEditCollectionName] = useState("");

  useEffect(() => {
    if (activeCollection !== "all") {
      const col = collections.find(c => c.id === activeCollection);
      setEditCollectionName(col?.name || "");
    }
  }, [activeCollection, collections]);

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [nextCollections, nextItems] = await Promise.all([
        libraryApi.collections(),
        libraryApi.papers()
      ]);
      setCollections(nextCollections);
      setItems(nextItems);
    } catch (err: any) {
      console.error("Lỗi", "Không thể tải thư viện: " + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {};
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(true);
  };

  const stats = useMemo(() => {
    let readCount = 0;
    let noteCount = 0;
    items.forEach(item => {
      if (item.status === 'done') readCount++;
      if (item.note && item.note.trim() !== '') noteCount++;
    });
    return {
      saved: items.length,
      read: readCount,
      notes: noteCount,
      collections: collections.length
    };
  }, [items, collections]);

  const filteredItems = useMemo(() => {
    let res = items;
    if (activeCollection !== "all") {
      res = res.filter(item => item.collectionIds.includes(activeCollection));
    }
    if (status !== "all") {
      res = res.filter(item => item.status === status);
    }
    if (query.trim() !== "") {
      const q = query.toLowerCase();
      res = res.filter(item => {
        if (!item.paper) return false;
        const q = query.toLowerCase();
        return item.paper.title.toLowerCase().includes(q) ||
          item.paper.authors.some(a => a.toLowerCase().includes(q));
      });
    }
    // Sort by savedAt (newest first)
    return res.sort((a, b) => (b.savedAt > a.savedAt ? 1 : -1));
  }, [items, activeCollection, status, query]);

  const openPaperDetails = (item: LibraryEntry) => {
    setSelectedPaper(item);
    setNoteText(item.note || "");
  };

  const closePaperDetails = () => {
    setSelectedPaper(null);
    setNoteText("");
  };

  const updateStatus = async (newStatus: "unread" | "reading" | "done") => {
    if (!selectedPaper) return;
    const colId = selectedPaper.collectionIds[0];
    if (!colId) return;

    try {
      await libraryApi.updateSavedPaper(colId, selectedPaper.paperId, { status: newStatus });
      setItems(prev => prev.map(it => it.id === selectedPaper.id ? { ...it, status: newStatus } : it));
      setSelectedPaper({ ...selectedPaper, status: newStatus });
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái.");
    }
  };

  const saveNote = async () => {
    if (!selectedPaper) return;
    const colId = selectedPaper.collectionIds[0];
    if (!colId) return;

    setSavingNote(true);
    try {
      await libraryApi.updateSavedPaper(colId, selectedPaper.paperId, { note: noteText });
      setItems(prev => prev.map(it => it.id === selectedPaper.id ? { ...it, note: noteText } : it));
      setSelectedPaper({ ...selectedPaper, note: noteText });
      Alert.alert("Thành công", "Đã lưu ghi chú.");
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể lưu ghi chú.");
    } finally {
      setSavingNote(false);
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      const created = await libraryApi.createCollection(newCollectionName.trim());
      const newCol = { id: created._id || created.id, name: created.collection_name, description: created.description || "" };
      setCollections(prev => [...prev, newCol]);
      setNewCollectionName("");
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể tạo bộ sưu tập: " + err.message);
    }
  };

  const updateCollection = async () => {
    if (activeCollection === "all" || !editCollectionName.trim()) return;
    try {
      await libraryApi.updateCollection(activeCollection, { collection_name: editCollectionName.trim() });
      setCollections(prev => prev.map(c => c.id === activeCollection ? { ...c, name: editCollectionName.trim() } : c));
      Alert.alert("Thành công", "Đã cập nhật bộ sưu tập.");
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể cập nhật: " + err.message);
    }
  };

  const deleteCollection = async () => {
    if (activeCollection === "all") return;
    Alert.alert(
      "Xác nhận xóa",
      "Xóa bộ sưu tập này?",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive", 
          onPress: async () => {
            try {
              await libraryApi.deleteCollection(activeCollection);
              setCollections(prev => prev.filter(c => c.id !== activeCollection));
              setActiveCollection("all");
              // Refresh papers to reflect missing collection
              const nextItems = await libraryApi.papers();
              setItems(nextItems);
            } catch (err: any) {
              Alert.alert("Lỗi", "Không thể xóa: " + err.message);
            }
          } 
        }
      ]
    );
  };

  const togglePaperCollection = async (colId: string) => {
    if (!selectedPaper) return;
    const isSelected = selectedPaper.collectionIds.includes(colId);
    try {
      if (isSelected) {
        await libraryApi.removePaper(colId, selectedPaper.paperId);
        const newColIds = selectedPaper.collectionIds.filter(id => id !== colId);
        if (newColIds.length === 0) {
          setItems(prev => prev.filter(it => it.id !== selectedPaper.id));
          closePaperDetails();
        } else {
          setItems(prev => prev.map(it => it.id === selectedPaper.id ? { ...it, collectionIds: newColIds } : it));
          setSelectedPaper({ ...selectedPaper, collectionIds: newColIds });
        }
      } else {
        await libraryApi.savePaper(selectedPaper.paperId, [colId], selectedPaper.note);
        const newColIds = [...selectedPaper.collectionIds, colId];
        setItems(prev => prev.map(it => it.id === selectedPaper.id ? { ...it, collectionIds: newColIds } : it));
        setSelectedPaper({ ...selectedPaper, collectionIds: newColIds });
      }
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể cập nhật bộ sưu tập.");
    }
  };

  const removePaper = async (item: LibraryEntry) => {
    const colId = item.collectionIds[0];
    if (!colId) return;

    try {
      await libraryApi.removePaper(colId, item.paperId);
      setItems(prev => prev.filter(it => it.id !== item.id));
      if (selectedPaper?.id === item.id) {
        closePaperDetails();
      }
    } catch (err: any) {
      Alert.alert("Lỗi", "Không thể xóa bài báo khỏi thư viện.");
    }
  };

  const confirmRemove = (item: LibraryEntry) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa bài báo này khỏi thư viện?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: () => removePaper(item) }
      ]
    );
  };

  const renderItem = ({ item }: { item: LibraryEntry }) => {
    if (!item.paper) return null;
    return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => openPaperDetails(item)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: theme.primaryWeak }]}>
          <Text variant="xs" color="primary" weight="bold">{STATUS_LABEL[item.status] || "Chưa đọc"}</Text>
        </View>
        <Text variant="xs" color="inkMuted">{item.paper.citations} trích dẫn</Text>
      </View>
      <Text variant="title" weight="bold" color="ink" numberOfLines={2} style={{ marginVertical: 6 }}>
        {item.paper.title}
      </Text>
      <Text variant="sm" color="inkMuted" numberOfLines={1}>
        {item.paper.authors.join(", ")}
      </Text>
      <Text variant="xs" color="inkMuted" style={{ marginTop: 4 }}>
        {item.paper.year} · {item.paper.source}
      </Text>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text variant="heading" weight="bold">Thư viện</Text>
        <ThemeToggle />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: (theme as any).accent1Weak, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
          <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Bài đã lưu</Text>
          <Text variant="heading" weight="bold" color="ink">{stats.saved}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: (theme as any).accent4Weak, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
          <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Đã đọc</Text>
          <Text variant="heading" weight="bold" color="ink">{stats.read}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: (theme as any).accent2Weak, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }]}>
          <Text variant="xs" color="ink" style={{ opacity: 0.7 }}>Ghi chú</Text>
          <Text variant="heading" weight="bold" color="ink">{stats.notes}</Text>
        </View>
      </View>

      {/* Collections Row */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.collectionChip,
              activeCollection === "all" ? { backgroundColor: theme.primary, borderColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 } : { backgroundColor: theme.surface, borderColor: theme.border }
            ]}
            onPress={() => setActiveCollection("all")}
          >
            <Text variant="sm" weight={activeCollection === "all" ? "bold" : "normal"} color={activeCollection === "all" ? "surface" : "inkMuted"}>Tất cả</Text>
          </TouchableOpacity>
          {collections.map(col => (
            <TouchableOpacity
              key={col.id}
              style={[
                styles.collectionChip,
                activeCollection === col.id ? { backgroundColor: theme.primary, borderColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 } : { backgroundColor: theme.surface, borderColor: theme.border }
              ]}
              onPress={() => setActiveCollection(col.id)}
            >
              <Text variant="sm" weight={activeCollection === col.id ? "bold" : "normal"} color={activeCollection === col.id ? "surface" : "ink"}>{col.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Create Collection */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8 }}>
        <TextInput
          style={[{ flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, borderRadius: 8, height: 40, color: theme.ink }]}
          placeholder="Tạo bộ sưu tập (vd: Survey 2026)"
          placeholderTextColor={theme.inkMuted}
          value={newCollectionName}
          onChangeText={setNewCollectionName}
        />
        <TouchableOpacity
          style={{ width: 40, height: 40, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
          onPress={createCollection}
        >
          <IconPlus color={theme.inkMuted} size={16} />
        </TouchableOpacity>
      </View>

      {/* Edit/Delete Collection */}
      {activeCollection !== "all" && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[{ flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, borderRadius: 8, height: 40, color: theme.ink }]}
            value={editCollectionName}
            onChangeText={setEditCollectionName}
          />
          <TouchableOpacity
            style={{ paddingHorizontal: 16, height: 40, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
            onPress={updateCollection}
          >
            <Text variant="xs" weight="bold">Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ paddingHorizontal: 16, height: 40, backgroundColor: theme.surface, borderColor: '#dc2626', borderWidth: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
            onPress={deleteCollection}
          >
            <Text variant="xs" weight="bold" style={{ color: '#dc2626' }}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search & Filters */}
      <View style={styles.filtersContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <IconSearch color={theme.inkMuted} size={18} />
          <TextInput 
            style={[styles.searchInput, { color: theme.ink }]}
            placeholder="Tìm trong thư viện..."
            placeholderTextColor={theme.inkMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <IconX color={theme.inkMuted} size={16} />
            </TouchableOpacity>
          )}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
          {(['all', 'unread', 'reading', 'done'] as StatusFilter[]).map(st => (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusChip,
                { backgroundColor: status === st ? theme.ink : theme.surface, borderColor: status === st ? theme.ink : theme.border }
              ]}
              onPress={() => setStatus(st)}
            >
              <Text variant="xs" weight={status === st ? "bold" : "normal"} color={status === st ? "surface" : "inkMuted"}>
                {st === 'all' ? 'Tất cả' : STATUS_LABEL[st]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Paper List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.center}>
          <Text color="inkMuted">Không có bài báo nào khớp với bộ lọc.</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={!!selectedPaper}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePaperDetails}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.bg }]}>
          {selectedPaper && (
            <>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={closePaperDetails}>
                  <Text variant="title" color="primary">Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmRemove(selectedPaper)}>
                  <Text variant="title" style={{ color: '#dc2626' }}>Xóa</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                <Text variant="heading" weight="bold" color="ink" style={{ marginBottom: 8 }}>
                  {selectedPaper.paper?.title}
                </Text>
                <Text variant="sm" color="inkMuted" style={{ marginBottom: 16 }}>
                  {selectedPaper.paper?.authors?.join(", ")}
                </Text>

                {/* Read Status */}
                <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Trạng thái đọc</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  {(['unread', 'reading', 'done'] as const).map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusSelectBtn,
                        { 
                          backgroundColor: selectedPaper.status === st ? theme.primaryWeak : theme.surface,
                          borderColor: selectedPaper.status === st ? theme.primary : theme.border 
                        }
                      ]}
                      onPress={() => updateStatus(st)}
                    >
                      <Text variant="xs" weight={selectedPaper.status === st ? "bold" : "normal"} color={selectedPaper.status === st ? "primary" : "inkMuted"}>
                        {STATUS_LABEL[st]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Collections */}
                <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Bộ sưu tập</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {collections.map(col => {
                    const isSelected = selectedPaper.collectionIds.includes(col.id);
                    return (
                      <TouchableOpacity
                        key={col.id}
                        style={[
                          styles.collectionChip,
                          { 
                            backgroundColor: isSelected ? theme.primaryWeak : theme.surface,
                            borderColor: isSelected ? theme.primary : theme.border 
                          }
                        ]}
                        onPress={() => togglePaperCollection(col.id)}
                      >
                        <Text variant="xs" weight={isSelected ? "bold" : "normal"} color={isSelected ? "primary" : "inkMuted"}>
                          {col.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Note */}
                <Text variant="sm" weight="bold" style={{ marginBottom: 8 }}>Ghi chú cá nhân</Text>
                <View style={[styles.noteContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.noteInput, { color: theme.ink }]}
                    placeholder="Thêm ghi chú của bạn về bài báo này..."
                    placeholderTextColor={theme.inkMuted}
                    multiline
                    value={noteText}
                    onChangeText={setNoteText}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                    <TouchableOpacity 
                      style={[styles.saveNoteBtn, { backgroundColor: theme.primary }]}
                      onPress={saveNote}
                      disabled={savingNote}
                    >
                      <Text variant="xs" weight="bold" color="surface">
                        {savingNote ? "Đang lưu..." : "Lưu ghi chú"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Abstract */}
                <Text variant="sm" weight="bold" style={{ marginTop: 24, marginBottom: 8 }}>Tóm tắt (Abstract)</Text>
                <Text variant="sm" color="inkMuted" style={{ lineHeight: 22, marginBottom: 24 }}>
                  {selectedPaper.paper?.abstract || "Không có tóm tắt."}
                </Text>

                {/* Link */}
                {!!selectedPaper.paper?.url && (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}
                    onPress={() => Linking.openURL(selectedPaper.paper?.url || '')}
                  >
                    <IconExternal color={theme.primary} size={16} />
                    <Text variant="sm" color="primary" style={{ marginLeft: 6 }}>Mở link gốc</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  collectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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
  statusSelectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  noteContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  saveNoteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../Text';
import { type WorkspaceMember, workspaceApi, libraryApi, paperApi } from '../../lib/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  members: WorkspaceMember[];
  onTaskCreated: () => void;
};

type TaskKind = 'task' | 'note' | 'discussion';

export function WorkspaceCreateTaskModal({ visible, onClose, workspaceId, workspaceName, members, onTaskCreated }: Props) {
  const { theme } = useTheme();
  
  const [kind, setKind] = useState<TaskKind>('task');
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [paperId, setPaperId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Paper Picker States
  const [paperTab, setPaperTab] = useState<'library'|'search'>('library');
  const [libraryPapers, setLibraryPapers] = useState<{id: string, title: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaperTitle, setSelectedPaperTitle] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, title: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);

  // Simplified Assignee Dropdown State
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  React.useEffect(() => {
    libraryApi.papers().then(res => {
      setLibraryPapers(res.map(i => ({ id: i.paperId, title: i.paper?.title || i.paperId })));
    }).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (paperTab !== 'search') return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      setSearchLoading(true);
      paperApi.search({ q: searchQuery.trim(), limit: 5 })
        .then(res => setSearchResults(res.papers))
        .catch(console.error)
        .finally(() => setSearchLoading(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, paperTab]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên task.");
      return;
    }
    
    setLoading(true);
    try {
      await workspaceApi.createItem(workspaceId, {
        title: title.trim(),
        kind,
        status: "backlog",
        assigneeId: assigneeId || undefined,
        due: dueDate.trim() || undefined,
        paperId: paperId.trim() || undefined,
        note: description.trim() || undefined,
      });
      
      Alert.alert("Thành công", "Đã tạo task mới!");
      // Reset form
      setKind('task');
      setTitle('');
      setAssigneeId('');
      setDueDate('');
      setPaperId('');
      setSelectedPaperTitle('');
      setDescription('');
      
      onTaskCreated();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể tạo task. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text variant="sm" weight="bold" color="inkMuted">Tạo item mới</Text>
              <Text variant="heading" weight="bold" style={{ marginTop: 4, marginBottom: 8 }}>Thêm task cho {workspaceName}</Text>
              <Text variant="sm" color="inkMuted" style={{ lineHeight: 20 }}>
                Điền thông tin như một issue nghiên cứu: loại việc, người phụ trách, deadline, paper liên kết và mô tả ban đầu.
              </Text>
            </View>

            {/* Tabs for Kind */}
            <View style={[styles.kindTabs, { backgroundColor: theme.surface2 }]}>
              {(['task', 'note', 'discussion'] as TaskKind[]).map((k) => (
                <TouchableOpacity 
                  key={k} 
                  style={[styles.kindTab, kind === k && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
                  onPress={() => setKind(k)}
                >
                  <Text weight={kind === k ? "bold" : "normal"} color={kind === k ? "ink" : "inkMuted"}>
                    {k === 'task' ? 'Công việc' : k === 'note' ? 'Ghi chú' : 'Thảo luận'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <TextInput 
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
              placeholder="Tên task, ghi chú hoặc thảo luận..."
              placeholderTextColor={theme.inkMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Assignee & Deadline Row */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8, position: 'relative' }}>
                <Text variant="sm" weight="bold" style={styles.label}>Phụ trách</Text>
                <TouchableOpacity 
                  style={[styles.dropdownBtn, { borderColor: theme.border }]} 
                  onPress={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                >
                  <Text color={assigneeId ? "ink" : "inkMuted"}>
                    {assigneeId ? (members.find(m => m.id === assigneeId)?.name || assigneeId) : "+ Thêm"}
                  </Text>
                </TouchableOpacity>
                {showAssigneeDropdown && (
                  <View style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setAssigneeId(''); setShowAssigneeDropdown(false); }}>
                      <Text>Bỏ trống</Text>
                    </TouchableOpacity>
                    {members.map(m => (
                      <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => { setAssigneeId(m.id); setShowAssigneeDropdown(false); }}>
                        <Text>{m.name || m.id}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text variant="sm" weight="bold" style={styles.label}>Deadline</Text>
                <TextInput 
                  style={[styles.input, { borderColor: theme.border, color: theme.ink, marginBottom: 0 }]} 
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={theme.inkMuted}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            </View>

            {/* Paper Selection */}
            <Text variant="sm" weight="bold" style={styles.label}>Bài báo liên kết</Text>
            <View style={[styles.kindTabs, { backgroundColor: theme.surface2, marginBottom: 8 }]}>
              <TouchableOpacity 
                style={[styles.kindTab, paperTab === 'library' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
                onPress={() => setPaperTab('library')}
              >
                <Text weight={paperTab === 'library' ? "bold" : "normal"} color={paperTab === 'library' ? "ink" : "inkMuted"}>Thư viện cá nhân</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.kindTab, paperTab === 'search' && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
                onPress={() => setPaperTab('search')}
              >
                <Text weight={paperTab === 'search' ? "bold" : "normal"} color={paperTab === 'search' ? "ink" : "inkMuted"}>Tìm kiếm toàn cục</Text>
              </TouchableOpacity>
            </View>

            {paperTab === 'library' ? (
              <View style={{ marginBottom: 20, zIndex: 9 }}>
                <TouchableOpacity 
                  style={[styles.dropdownBtn, { borderColor: theme.border }]} 
                  onPress={() => setShowLibraryDropdown(!showLibraryDropdown)}
                >
                  <Text color={paperId ? "ink" : "inkMuted"} numberOfLines={1}>
                    {paperId ? (libraryPapers.find(p => p.id === paperId)?.title || paperId) : "Chọn bài báo từ thư viện..."}
                  </Text>
                </TouchableOpacity>
                {showLibraryDropdown && (
                  <ScrollView style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: 200 }]} nestedScrollEnabled>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setPaperId(''); setShowLibraryDropdown(false); }}>
                      <Text color="inkMuted">Bỏ chọn</Text>
                    </TouchableOpacity>
                    {libraryPapers.map(p => (
                      <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => { setPaperId(p.id); setShowLibraryDropdown(false); }}>
                        <Text numberOfLines={2}>{p.title}</Text>
                      </TouchableOpacity>
                    ))}
                    {libraryPapers.length === 0 && (
                      <View style={{ padding: 12 }}><Text color="inkMuted">Thư viện trống</Text></View>
                    )}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={{ marginBottom: 20, zIndex: 9 }}>
                <TextInput 
                  style={[styles.input, { borderColor: theme.border, color: theme.ink, marginBottom: 8 }]} 
                  placeholder="Nhập tên bài báo để tìm kiếm..."
                  placeholderTextColor={theme.inkMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text !== selectedPaperTitle) {
                      setPaperId('');
                      setSelectedPaperTitle('');
                    }
                  }}
                />
                {searchLoading && <Text variant="xs" color="inkMuted" style={{ marginBottom: 8 }}>Đang tìm kiếm...</Text>}
                {!searchLoading && searchResults.length > 0 && searchQuery !== selectedPaperTitle && (
                  <ScrollView style={[styles.dropdownMenu, { top: 55, backgroundColor: theme.surface, borderColor: theme.border, maxHeight: 200 }]} nestedScrollEnabled>
                    {searchResults.map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={[styles.dropdownItem, paperId === p.id && { backgroundColor: theme.surface2 }]} 
                        onPress={() => {
                          setPaperId(p.id);
                          setSearchQuery(p.title);
                          setSelectedPaperTitle(p.title);
                          setSearchResults([]);
                        }}
                      >
                        <Text numberOfLines={2} weight={paperId === p.id ? "bold" : "normal"}>{p.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Description */}
            <Text variant="sm" weight="bold" style={styles.label}>Mô tả ban đầu</Text>
            <TextInput 
              style={[styles.input, styles.textArea, { borderColor: theme.border, color: theme.ink }]} 
              placeholder="Mục tiêu, câu hỏi nghiên cứu, việc cần nhóm phản hồi..."
              placeholderTextColor={theme.inkMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Footer actions */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.btn, { borderWidth: 1, borderColor: theme.border }]} onPress={onClose}>
              <Text weight="bold">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} onPress={handleCreate} disabled={loading}>
              {loading ? <ActivityIndicator color={theme.surface} size="small" /> : <Text weight="bold" color="surface">+ Tạo task</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  kindTabs: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  kindTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    zIndex: 10,
  },
  label: {
    marginBottom: 8,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    height: 46,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 150,
    zIndex: 999,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  textArea: {
    minHeight: 120,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  }
});

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { IconCalendar } from '../icons';
import { Text } from '../Text';
import { type WorkspaceItem, type WorkspaceMember, workspaceApi, type WorkspaceActivity } from '../../lib/api';

export function TaskDetailModal({ 
  visible, 
  onClose, 
  workspaceId, 
  item, 
  members,
  onItemUpdated
}: { 
  visible: boolean, 
  onClose: () => void, 
  workspaceId: string,
  item: WorkspaceItem,
  members: WorkspaceMember[],
  onItemUpdated: () => void
}) {
  const { theme } = useTheme();

  // Local state for editing fields
  const [status, setStatus] = useState(item.status);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(item.assigneeIds || (item.assigneeId ? [item.assigneeId] : []));
  const [dueDate, setDueDate] = useState((item.due && item.due !== 'Chưa đặt') ? item.due : '');
  const [note, setNote] = useState(item.note || '');
  const [paperId, setPaperId] = useState(item.paperId || '');
  const [selectedPaperTitle, setSelectedPaperTitle] = useState(item._populatedPaper?.title || '');
  
  const [newComment, setNewComment] = useState('');
  
  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Update state if item prop changes
  useEffect(() => {
    if (visible && item) {
      setStatus(item.status);
      setAssigneeIds(item.assigneeIds || (item.assigneeId ? [item.assigneeId] : []));
      setDueDate((item.due && item.due !== 'Chưa đặt') ? item.due : '');
      setNote(item.note || '');
      setPaperId(item.paperId || '');
      setSelectedPaperTitle(item._populatedPaper?.title || '');
    }
  }, [visible, item]);

  // Fetch activities
  useEffect(() => {
    if (visible && workspaceId) {
      setActivitiesLoading(true);
      workspaceApi.activities(workspaceId)
        .then(acts => {
          // Filter activities related to this item
          setActivities(acts.filter(a => a.target && a.target.includes(item.id)));
        })
        .catch(console.error)
        .finally(() => setActivitiesLoading(false));
    }
  }, [visible, workspaceId, item.id]);

  // Paper selection logic from Create modal
  const [paperTab, setPaperTab] = useState<'library'|'search'>('library');
  const [libraryPapers, setLibraryPapers] = useState<{id: string, title: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState(item._populatedPaper?.title || '');
  const [searchResults, setSearchResults] = useState<{id: string, title: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  useEffect(() => {
    if (visible && paperTab === 'library') {
      workspaceApi.items(workspaceId).then(items => {
        const papers = items
          .filter(i => i.kind === 'paper' && i.paperId)
          .map(i => ({ id: i.paperId, title: i.title }));
        setLibraryPapers(papers);
      }).catch(console.error);
    }
  }, [visible, paperTab, workspaceId]);

  useEffect(() => {
    if (paperTab !== 'search') return;
    if (!searchQuery.trim() || searchQuery === selectedPaperTitle) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      setSearchLoading(true);
      setSearchLoading(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery, paperTab, selectedPaperTitle]);

  const handleUpdate = async (patch: Partial<WorkspaceItem>) => {
    try {
      await workspaceApi.updateItem(workspaceId, item.id, patch);
      onItemUpdated();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật task");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    handleUpdate({ status: newStatus });
  };

  const handleAddAssignee = (id: string) => {
    if (!assigneeIds.includes(id)) {
      const newIds = [...assigneeIds, id];
      setAssigneeIds(newIds);
      handleUpdate({ assigneeIds: newIds });
    }
    setShowAssigneeDropdown(false);
  };

  const handleRemoveAssignee = (id: string) => {
    const newIds = assigneeIds.filter(aid => aid !== id);
    setAssigneeIds(newIds);
    handleUpdate({ assigneeIds: newIds });
  };

  const handleNoteBlur = () => {
    if (note !== item.note) {
      handleUpdate({ note });
    }
  };

  const handleDateBlur = () => {
    if (dueDate !== item.due) {
      handleUpdate({ due: dueDate });
    }
  };

  const handleDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${formatted.slice(0, 5)}/${cleaned.slice(4, 8)}`;
    }
    setDueDate(formatted);
  };

  const handlePaperChange = (pId: string, pTitle: string) => {
    setPaperId(pId);
    setSelectedPaperTitle(pTitle);
    setSearchQuery(pTitle);
    setShowLibraryDropdown(false);
    setSearchResults([]);
    handleUpdate({ paperId: pId });
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await workspaceApi.addComment(workspaceId, item.id, { content: newComment.trim() });
      setNewComment('');
      onItemUpdated(); // will refresh the item and comments
    } catch (err) {
      Alert.alert("Lỗi", "Không thể gửi bình luận");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.kindBadge, { backgroundColor: theme.surface2 }]}>
            <Text variant="xs" color="primary" weight="bold">
              {item.kind === 'task' ? 'Công việc' : item.kind === 'note' ? 'Ghi chú' : 'Thảo luận'}
            </Text>
          </View>
          <TouchableOpacity style={[styles.exitBtn, { borderColor: theme.border }]} onPress={onClose}>
            <Text variant="sm" color="danger">Quay lại không gian làm việc</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text variant="heading" weight="bold" style={{ marginBottom: 16 }}>{item.title}</Text>
          
          <View style={styles.metaStrip}>
            <View style={[styles.metaChip, { backgroundColor: theme.surface2 }]}><Text variant="xs">{item.kind === 'task' ? 'Công việc' : item.kind === 'note' ? 'Ghi chú' : 'Thảo luận'}</Text></View>
            <View style={[styles.metaChip, { backgroundColor: theme.surface2 }]}>
              <Text variant="xs">{assigneeIds.length ? assigneeIds.map(id => members.find(m => m.id === id)?.name || id).join(', ') : 'Chưa phân công'}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: theme.surface2 }]}><Text variant="xs">{item.due || 'Chưa đặt'}</Text></View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Trạng thái</Text>
            <View style={[styles.segmentControl, { backgroundColor: theme.surface2 }]}>
              <TouchableOpacity style={[styles.segmentBtn, status === 'backlog' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('backlog')}>
                <Text weight={status === 'backlog' ? 'bold' : 'normal'}>Cần làm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, status === 'doing' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('doing')}>
                <Text weight={status === 'doing' ? 'bold' : 'normal'}>Đang làm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentBtn, status === 'done' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('done')}>
                <Text weight={status === 'done' ? 'bold' : 'normal'}>Đã xong</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Assignees */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Phụ trách</Text>
            <View style={styles.assigneeRow}>
              {assigneeIds.map(aId => {
                const mem = members.find(m => m.id === aId);
                return (
                  <TouchableOpacity key={aId} style={[styles.assigneeChip, { backgroundColor: theme.primary }]} onPress={() => handleRemoveAssignee(aId)}>
                    <View style={styles.avatar}><Text variant="xs" color="ink">{mem?.name?.substring(0, 1).toUpperCase()}</Text></View>
                    <Text variant="xs" color="surface" weight="bold">{mem?.name || aId}</Text>
                    <Text variant="xs" color="surface" style={{ marginLeft: 4 }}>×</Text>
                  </TouchableOpacity>
                );
              })}
              
              <View style={{ zIndex: 10 }}>
                <TouchableOpacity 
                  style={[styles.addAssigneeBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                >
                  <Text variant="xs" color="inkMuted">+ Thêm ▼</Text>
                </TouchableOpacity>
                
                {showAssigneeDropdown && (
                  <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border, elevation: 5 }]}>
                    {members.filter(m => !assigneeIds.includes(m.id)).map(m => (
                      <TouchableOpacity key={m.id} style={styles.dropdownItem} onPress={() => handleAddAssignee(m.id)}>
                        <Text>{m.name}</Text>
                      </TouchableOpacity>
                    ))}
                    {members.filter(m => !assigneeIds.includes(m.id)).length === 0 && (
                      <View style={styles.dropdownItem}><Text color="inkMuted">Không còn ai</Text></View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Deadline</Text>
            <View style={[styles.input, { borderColor: theme.border, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 }]}>
              <TextInput
                style={{ flex: 1, color: theme.ink, padding: 0 }}
                value={dueDate}
                onChangeText={handleDateChange}
                onBlur={handleDateBlur}
                placeholder="dd/mm/yyyy"
                placeholderTextColor={theme.inkMuted}
                keyboardType="numeric"
                maxLength={10}
              />
              <IconCalendar color={theme.ink} size={18} />
            </View>
          </View>

          {/* Paper Linking */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Bài liên kết</Text>
            <View style={[styles.kindTabs, { backgroundColor: theme.surface2, marginBottom: 8 }]}>
              <TouchableOpacity style={[styles.kindTab, paperTab === 'library' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => setPaperTab('library')}>
                <Text weight={paperTab === 'library' ? "bold" : "normal"}>Thư viện cá nhân</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.kindTab, paperTab === 'search' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => setPaperTab('search')}>
                <Text weight={paperTab === 'search' ? "bold" : "normal"}>Tìm kiếm toàn cục</Text>
              </TouchableOpacity>
            </View>

            {paperTab === 'library' ? (
              <View style={{ zIndex: 9, marginBottom: 16 }}>
                <TouchableOpacity style={[styles.dropdownBtn, { borderColor: theme.border }]} onPress={() => setShowLibraryDropdown(!showLibraryDropdown)}>
                  <Text numberOfLines={1}>{selectedPaperTitle || paperId || "Chọn bài báo từ thư viện..."}</Text>
                </TouchableOpacity>
                {showLibraryDropdown && (
                  <ScrollView style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, elevation: 5 }]} nestedScrollEnabled>
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handlePaperChange('', '')}>
                      <Text color="inkMuted">Bỏ chọn</Text>
                    </TouchableOpacity>
                    {libraryPapers.map(p => (
                      <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => handlePaperChange(p.id, p.title)}>
                        <Text numberOfLines={2}>{p.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={{ zIndex: 9, marginBottom: 16 }}>
                <TextInput 
                  style={[styles.input, { borderColor: theme.border, color: theme.ink }]} 
                  placeholder="Nhập ID bài báo hoặc tên..."
                  placeholderTextColor={theme.inkMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text !== selectedPaperTitle) {
                      setPaperId(text);
                    }
                  }}
                  onBlur={() => {
                    if (paperId !== item.paperId) handleUpdate({ paperId });
                  }}
                />
              </View>
            )}
          </View>

          {/* Note/Description */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Nội dung ghi chú</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink, minHeight: 100 }]}
              multiline
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
              onBlur={handleNoteBlur}
              placeholder="Ghi lại mục tiêu, kết luận đọc paper, hoặc câu hỏi..."
              placeholderTextColor={theme.inkMuted}
            />
          </View>
          
          {/* Paper Info Card */}
          {item._populatedPaper && (
            <View style={[styles.paperCard, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
              <Text variant="xs" color="inkMuted">Bài báo</Text>
              <Text weight="bold" style={{ marginVertical: 4 }}>{item._populatedPaper.title}</Text>
              <Text variant="xs" color="inkMuted">{item._populatedPaper.authors?.map((a:any) => a.name).join(', ')}</Text>
            </View>
          )}

          {/* Members */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Thành viên & quyền</Text>
            <View style={{ gap: 8 }}>
              {members.map(m => (
                <View key={m.id} style={[styles.memberRow, { borderColor: theme.border }]}>
                  <View style={styles.memberAvatar}><Text color="surface" weight="bold">{m.name?.substring(0, 1).toUpperCase()}</Text></View>
                  <Text style={{ flex: 1, marginLeft: 12 }}>{m.name}</Text>
                  <View style={[styles.roleBadge, { borderColor: theme.border }]}><Text variant="xs">{m.role}</Text></View>
                </View>
              ))}
            </View>
          </View>

          {/* Discussion */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Discussion</Text>
            <View style={{ gap: 12, marginBottom: 12 }}>
              {item.comments?.map((c: any) => (
                <View key={c.id || c.timestamp} style={[styles.commentCard, { backgroundColor: theme.surface2 }]}>
                  <Text weight="bold" variant="xs">{c.author_name}</Text>
                  <Text style={{ marginTop: 4 }}>{c.content}</Text>
                </View>
              ))}
            </View>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink, minHeight: 80 }]}
              multiline
              textAlignVertical="top"
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Thêm bình luận cho nhóm..."
              placeholderTextColor={theme.inkMuted}
            />
            <TouchableOpacity style={[styles.commentBtn, { backgroundColor: theme.primary }]} onPress={handleAddComment}>
              <Text color="surface" weight="bold">Gửi bình luận</Text>
            </TouchableOpacity>
          </View>

          {/* Activities */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Hoạt động của item</Text>
            {activitiesLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <View style={{ gap: 16 }}>
                {activities.length === 0 && <Text variant="xs" color="inkMuted">Chưa có hoạt động nào</Text>}
                {activities.map((a, idx) => (
                  <View key={a.id || idx} style={styles.activityRow}>
                    <View style={[styles.activityDot, { backgroundColor: theme.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text weight="bold" variant="sm">{a.userName || 'Người dùng'}</Text>
                      <Text variant="xs" color="inkMuted">{a.action}</Text>
                      <Text variant="xs" color="inkMuted">{a.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  kindBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exitBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  body: {
    flex: 1,
  },
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
  },
  segmentControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  assigneeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingRight: 8,
    borderRadius: 16,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  addAssigneeBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dropdown: {
    position: 'absolute',
    top: 35,
    left: 0,
    width: 150,
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 999,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  kindTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 8,
  },
  kindTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  dropdownBtn: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 999,
  },
  paperCard: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  commentCard: {
    padding: 12,
    borderRadius: 8,
  },
  commentBtn: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  activityRow: {
    flexDirection: 'row',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    marginRight: 12,
  },
});

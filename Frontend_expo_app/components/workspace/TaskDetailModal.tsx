import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, Platform, StatusBar, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconCalendar, IconX, IconTrash, IconLogOut } from '../icons';
import { Text } from '../Text';
import { type WorkspaceItem, type WorkspaceMember, workspaceApi, type WorkspaceActivity, libraryApi, paperApi } from '../../lib/api';

const renderMentions = (text: string) => {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <Text key={i} color="primary" weight="bold">
          {part}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
};

export function TaskDetailModal({ 
  visible, 
  onClose, 
  workspaceId, 
  item, 
  members,
  canEdit = true,
  refreshing = false,
  onRefresh,
  onItemUpdated
}: { 
  visible: boolean, 
  onClose: () => void, 
  workspaceId: string,
  item: WorkspaceItem,
  members: WorkspaceMember[],
  canEdit?: boolean,
  refreshing?: boolean,
  onRefresh?: () => void,
  onItemUpdated: () => void
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [commentSectionY, setCommentSectionY] = useState(0);
  const [inputRelativeY, setInputRelativeY] = useState(0);

  // Local state for editing fields
  const [status, setStatus] = useState(item.status);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(item.assigneeIds || (item.assigneeId ? [item.assigneeId] : []));
  const [dueDate, setDueDate] = useState((item.due && item.due !== 'Chưa đặt') ? item.due : '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState(item.note || '');
  const [paperId, setPaperId] = useState(item.paperId || '');
  const [selectedPaperTitle, setSelectedPaperTitle] = useState(item._populatedPaper?.title || '');
  
  const [visibleCommentsCount, setVisibleCommentsCount] = useState(5);
  const [newComment, setNewComment] = useState('');
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
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
      libraryApi.papers().then(res => {
        setLibraryPapers(res.map(i => ({ id: i.paperId, title: i.paper?.title || i.paperId })));
      }).catch(console.error);
    }
  }, [visible, paperTab]);

  useEffect(() => {
    if (paperTab !== 'search') return;
    if (!searchQuery.trim() || searchQuery === selectedPaperTitle) {
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
  }, [searchQuery, paperTab, selectedPaperTitle]);

  const handleUpdate = async (patch: Partial<WorkspaceItem>) => {
    try {
      await workspaceApi.updateItem(workspaceId, item.id, patch);
      onItemUpdated();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật task");
    }
  };

  const handleDeleteItem = () => {
    Alert.alert("Xác nhận", "Bạn chắc chắn muốn xóa task này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
        try {
          await workspaceApi.deleteItem(workspaceId, item.id);
          onClose();
          onItemUpdated();
        } catch(e) { Alert.alert("Lỗi", "Không thể xóa task"); }
      }}
    ]);
  };

  const handleLeaveTask = () => {
    Alert.alert("Xác nhận", "Rời khỏi task này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Rời khỏi", style: "destructive", onPress: async () => {
        const newIds = assigneeIds.filter(aid => aid !== (user?.id || (user as any)?._id));
        setAssigneeIds(newIds);
        await handleUpdate({ assigneeIds: newIds });
        if (onRefresh) onRefresh();
        onClose(); // Automatically close after leaving
      }}
    ]);
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate && event.type === 'set') {
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formatted = `${year}-${month}-${day}`;
      setDueDate(formatted);
      if (formatted !== item.due) {
        handleUpdate({ due: formatted });
      }
    }
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
      await workspaceApi.addComment(workspaceId, item.id, { 
        content: newComment.trim(),
        author_name: user?.full_name || user?.name || "Người dùng"
      });
      setNewComment('');
      onItemUpdated(); // will refresh the item and comments
    } catch (err) {
      Alert.alert("Lỗi", "Không thể gửi bình luận");
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert("Xóa bình luận", "Bạn chắc chắn muốn xóa?", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: async () => {
        try {
          await workspaceApi.deleteComment(workspaceId, item.id, commentId);
          onItemUpdated();
        } catch(e) { Alert.alert("Lỗi", "Không thể xóa"); }
      }}
    ]);
  };

  const handleEditComment = async () => {
    if (!editingCommentId || !editContent.trim()) return;
    try {
      await workspaceApi.editComment(workspaceId, item.id, editingCommentId, editContent.trim());
      setEditingCommentId(null);
      setEditContent('');
      onItemUpdated();
    } catch(e) { Alert.alert("Lỗi", "Không thể sửa"); }
  };

  const currentMemberRole = members.find(m => m.id === user?.id || m.id === (user as any)?._id)?.role;
  const isOwner = currentMemberRole === 'owner';

  const handleRoleChange = (memberId: string, currentRole: string) => {
    if (currentRole === 'owner') {
      Alert.alert("Lỗi", "Không thể đổi quyền của Owner");
      return;
    }
    if (!isOwner) {
      Alert.alert("Từ chối", "Bạn phải là Owner mới được đổi quyền");
      return;
    }
    const newRole = currentRole === 'editor' ? 'viewer' : 'editor';
    Alert.alert("Đổi quyền", `Chuyển thành ${newRole}?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Đổi", onPress: async () => {
        try {
          await workspaceApi.updateMember(workspaceId, memberId, newRole);
          onItemUpdated();
        } catch (e: any) { Alert.alert("Lỗi", e.message || "Không thể đổi quyền"); }
      }}
    ]);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.kindBadge, { backgroundColor: theme.surface2 }]}>
            <Text variant="xs" color="primary" weight="bold">
              {item.kind === 'task' ? 'Công việc' : item.kind === 'note' ? 'Ghi chú' : 'Thảo luận'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {assigneeIds.includes(user?.id || (user as any)?._id) && (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.surface2 }]} onPress={handleLeaveTask}>
                <IconLogOut color={theme.inkMuted} size={18} />
              </TouchableOpacity>
            )}
            {canEdit && (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#fee2e2' }]} onPress={handleDeleteItem}>
                <IconTrash color={theme.danger} size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.surface2 }]} onPress={onClose}>
              <IconX color={theme.ink} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.body} 
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} /> : undefined
          }
        >
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
              <TouchableOpacity disabled={!canEdit} style={[styles.segmentBtn, status === 'backlog' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('backlog')}>
                <Text weight={status === 'backlog' ? 'bold' : 'normal'}>Cần làm</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!canEdit} style={[styles.segmentBtn, status === 'doing' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('doing')}>
                <Text weight={status === 'doing' ? 'bold' : 'normal'}>Đang làm</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!canEdit} style={[styles.segmentBtn, status === 'done' && { backgroundColor: theme.surface, elevation: 2 }]} onPress={() => handleStatusChange('done')}>
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
                  <TouchableOpacity disabled={!canEdit} key={aId} style={[styles.assigneeChip, { backgroundColor: theme.primary }]} onPress={() => handleRemoveAssignee(aId)}>
                    <View style={styles.avatar}><Text variant="xs" color="ink">{mem?.name?.substring(0, 1).toUpperCase()}</Text></View>
                    <Text variant="xs" color="surface" weight="bold">{mem?.name || aId}</Text>
                    {canEdit && <Text variant="xs" color="surface" style={{ marginLeft: 4 }}>×</Text>}
                  </TouchableOpacity>
                );
              })}
              
              {canEdit && (
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
              )}
            </View>
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Deadline</Text>
            <TouchableOpacity 
              disabled={!canEdit}
              style={[styles.input, { borderColor: theme.border, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ flex: 1, color: dueDate ? theme.ink : theme.inkMuted }}>
                {dueDate ? dueDate.split('-').reverse().join('/') : "Chọn deadline"}
              </Text>
              <IconCalendar color={theme.ink} size={18} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate ? new Date(dueDate) : new Date()}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
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
                <TouchableOpacity disabled={!canEdit} style={[styles.dropdownBtn, { borderColor: theme.border }]} onPress={() => setShowLibraryDropdown(!showLibraryDropdown)}>
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
                    {libraryPapers.length === 0 && (
                      <View style={{ padding: 12 }}><Text color="inkMuted">Thư viện trống</Text></View>
                    )}
                  </ScrollView>
                )}
              </View>
            ) : (
              <View style={{ zIndex: 9, marginBottom: 16 }}>
                <TextInput 
                  editable={canEdit}
                  style={[styles.input, { borderColor: theme.border, color: theme.ink, marginBottom: 8 }]} 
                  placeholder="Nhập tên bài báo để tìm kiếm..."
                  placeholderTextColor={theme.inkMuted}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (text !== selectedPaperTitle) {
                      setPaperId('');
                    }
                  }}
                  onBlur={() => {
                    if (paperId !== item.paperId) handleUpdate({ paperId });
                  }}
                />
                {searchLoading && <Text variant="xs" color="inkMuted" style={{ marginBottom: 8 }}>Đang tìm kiếm...</Text>}
                {!searchLoading && searchResults.length > 0 && searchQuery !== selectedPaperTitle && (
                  <ScrollView style={[styles.dropdownMenu, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: 200 }]} nestedScrollEnabled>
                    {searchResults.map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        style={[styles.dropdownItem, paperId === p.id && { backgroundColor: theme.surface2 }]} 
                        onPress={() => {
                          setPaperId(p.id);
                          setSearchQuery(p.title);
                          setSelectedPaperTitle(p.title);
                          setSearchResults([]);
                          handleUpdate({ paperId: p.id });
                        }}
                      >
                        <Text numberOfLines={2} weight={paperId === p.id ? "bold" : "normal"}>{p.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Note/Description */}
          <View style={styles.section}>
            <Text variant="sm" weight="bold" style={styles.label}>Nội dung ghi chú</Text>
            <TextInput
              editable={canEdit}
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
                  <TouchableOpacity 
                    style={[styles.roleBadge, { borderColor: theme.border }]}
                    disabled={!isOwner || m.role === 'owner'}
                    onPress={() => handleRoleChange(m.id, m.role)}
                  >
                    <Text variant="xs">{m.role}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Discussion */}
          <View 
            style={styles.section}
            onLayout={(e) => setCommentSectionY(e.nativeEvent.layout.y)}
          >
            <Text variant="sm" weight="bold" style={styles.label}>Thảo luận</Text>
            <View style={{ gap: 12, marginBottom: 12 }}>
              {item.comments?.slice(0, visibleCommentsCount).map((c: any) => {
                const isAuthor = c.authorId === user?.id || c.author_id === user?.id;
                const cId = c.id || c.comment_id || c.timestamp;
                const isEditing = editingCommentId === cId;
                return (
                <View key={cId} style={[styles.commentCard, { backgroundColor: theme.surface2 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text weight="bold" variant="xs">{c.authorName || c.author_name || 'Người dùng'}</Text>
                    <Text variant="xs" color="inkMuted">{c.createdAt || c.created_at}</Text>
                  </View>
                  {isEditing ? (
                    <View style={{ marginTop: 8 }}>
                      <TextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.ink, paddingVertical: 4, minHeight: 60 }]}
                        value={editContent}
                        onChangeText={setEditContent}
                        multiline
                      />
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                        <TouchableOpacity onPress={() => setEditingCommentId(null)}><Text color="inkMuted" variant="xs">Hủy</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handleEditComment}><Text color="primary" variant="xs" weight="bold">Lưu</Text></TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={{ marginTop: 4 }}>{renderMentions(c.content)}</Text>
                      {isAuthor && (
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                          <TouchableOpacity onPress={() => { setEditingCommentId(cId); setEditContent(c.content); }}><Text color="primary" variant="xs">Sửa</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteComment(cId)}><Text style={{ color: '#ff4444' }} variant="xs">Xóa</Text></TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
                );
              })}
              {(item.comments?.length || 0) > visibleCommentsCount && (
                <TouchableOpacity 
                  style={{ padding: 8, alignItems: 'center', backgroundColor: theme.surface2, borderRadius: 8 }}
                  onPress={() => setVisibleCommentsCount(prev => prev + 5)}
                >
                  <Text color="primary" variant="xs">Tải thêm bình luận ({(item.comments?.length || 0) - visibleCommentsCount} bình luận nữa)</Text>
                </TouchableOpacity>
              )}
            </View>
            <View 
              style={{ zIndex: 10 }}
              onLayout={(e) => setInputRelativeY(e.nativeEvent.layout.y)}
            >
              {(() => {
                const words = newComment.split(' ');
                const lastWord = words[words.length - 1];
                if (lastWord.startsWith('@')) {
                  const search = lastWord.slice(1).toLowerCase();
                  const suggestedMembers = members.filter(m => m.name?.toLowerCase().includes(search));
                  if (suggestedMembers.length > 0) {
                    return (
                      <View style={{
                        position: 'absolute', bottom: '100%', left: 0, right: 0, 
                        backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, 
                        borderRadius: 12, maxHeight: 180, marginBottom: 12, zIndex: 20,
                        shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10
                      }}>
                        <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ padding: 6 }}>
                          {suggestedMembers.map(m => {
                            const initials = m.name?.substring(0, 1).toUpperCase() || '?';
                            return (
                              <TouchableOpacity 
                                key={m.id} 
                                style={{ 
                                  paddingVertical: 10, paddingHorizontal: 12, 
                                  flexDirection: 'row', alignItems: 'center', gap: 12,
                                  borderRadius: 8
                                }}
                                onPress={() => {
                                  const newWords = [...words];
                                  newWords[newWords.length - 1] = `@${m.name} `;
                                  setNewComment(newWords.join(' '));
                                }}
                              >
                                <View style={{
                                  width: 28, height: 28, borderRadius: 14,
                                  backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center'
                                }}>
                                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{initials}</Text>
                                </View>
                                <Text weight="bold" style={{ fontSize: 14 }}>{m.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    );
                  }
                }
                return null;
              })()}
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.ink, minHeight: 80 }]}
                multiline
                textAlignVertical="top"
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Thêm bình luận cho nhóm (gõ @ để nhắc tên)..."
                placeholderTextColor={theme.inkMuted}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: commentSectionY + inputRelativeY - 40, animated: true });
                  }, 150);
                }}
              />
            </View>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 4,
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

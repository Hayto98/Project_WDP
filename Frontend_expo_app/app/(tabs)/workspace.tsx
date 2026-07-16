import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconArrowLeft, IconPlus, IconGrid, IconTrash, IconSettings } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { workspaceApi } from '../../lib/api';
import { type Workspace, type WorkspaceMember, type WorkspaceItem, type CollaborationInvite, API_BASE_URL, formatWhen } from '../../lib/api';
import { io, Socket } from 'socket.io-client';

import { WorkspaceBoard } from '../../components/workspace/WorkspaceBoard';
import { WorkspaceMembers } from '../../components/workspace/WorkspaceMembers';
import { WorkspaceInvites } from '../../components/workspace/WorkspaceInvites';
import { WorkspacePapers } from '../../components/workspace/WorkspacePapers';
import { WorkspaceCreateTaskModal } from '../../components/workspace/WorkspaceCreateTaskModal';
import { TaskDetailModal } from '../../components/workspace/TaskDetailModal';

type WorkspaceMode = "board" | "members" | "invites" | "papers";

export default function WorkspaceScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [mode, setMode] = useState<WorkspaceMode>("board");
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [invites, setInvites] = useState<CollaborationInvite[]>([]);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorkspaceItem | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [refreshingData, setRefreshingData] = useState(false);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const ws = await workspaceApi.workspaces();
      setWorkspaces(ws);
      if (ws.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(ws[0].id);
      }
      const inv = await workspaceApi.invites();
      setInvites(inv);
    } catch (err) {
      console.error("Failed to load workspaces", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const loadWorkspaceDetails = async (id: string) => {
    if (!id) return;
    try {
      const mem = await workspaceApi.workspaceMembers(id);
      setMembers(mem);
      const it = await workspaceApi.items(id);
      setItems(it);
      setSelectedItem(prev => {
        if (!prev) return null;
        return it.find(i => i.id === prev.id) || prev;
      });
    } catch (err) {
      console.error("Failed to load workspace details", err);
    }
  };

  useEffect(() => {
    loadWorkspaceDetails(activeWorkspaceId);
  }, [activeWorkspaceId]);

  const handleRefresh = async () => {
    setRefreshingData(true);
    await loadInitial();
    if (activeWorkspaceId) {
      await loadWorkspaceDetails(activeWorkspaceId);
    }
    setRefreshingData(false);
  };

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const backendUrl = API_BASE_URL.replace("/api/v1", "");
    const socket: Socket = io(backendUrl, { transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      socket.emit("join_workspace", activeWorkspaceId);
    });

    socket.on("comment_added", (data: { itemId: string; comment: any }) => {
      setItems((current) => current.map((item) => {
        if (item.id === data.itemId) {
          const commentId = data.comment.comment_id || data.comment.id || data.comment._id;
          if (item.comments?.some(c => c.id === commentId)) return item;
          return { 
            ...item, 
            comments: [...(item.comments || []), { 
              id: commentId, 
              content: data.comment.content, 
              authorId: data.comment.author_id || data.comment.authorId, 
              authorName: data.comment.author_name || data.comment.authorName, 
              createdAt: formatWhen(data.comment.created_at || data.comment.createdAt)
            }] 
          };
        }
        return item;
      }));
    });

    socket.on("comment_edited", (data: { itemId: string; commentId: string; content: string }) => {
      setItems((current) => current.map((item) => {
        if (item.id === data.itemId) {
          return { ...item, comments: (item.comments || []).map(c => c.id === data.commentId ? { ...c, content: data.content } : c) };
        }
        return item;
      }));
    });

    socket.on("comment_deleted", (data: { itemId: string; commentId: string }) => {
      setItems((current) => current.map((item) => {
        if (item.id === data.itemId) {
          return { ...item, comments: (item.comments || []).filter(c => c.id !== data.commentId) };
        }
        return item;
      }));
    });

    return () => {
      socket.emit("leave_workspace", activeWorkspaceId);
      socket.disconnect();
    };
  }, [activeWorkspaceId]);

  const activeWorkspace = useMemo(() => workspaces.find(w => w.id === activeWorkspaceId), [workspaces, activeWorkspaceId]);
  
  const currentMemberRole = useMemo(() => {
    if (!user) return 'viewer';
    const m = members.find(m => m.id === user.id || m.id === (user as any)?._id);
    return m?.role || 'viewer';
  }, [members, user]);

  const isOwner = currentMemberRole === 'owner';
  const canEdit = currentMemberRole === 'owner' || currentMemberRole === 'editor';

  useEffect(() => {
    setSelectedItem(prev => {
      if (!prev) return null;
      const updated = items.find(i => i.id === prev.id);
      // Only update if reference changed to prevent unnecessary re-renders, but since items is immutable it's a new ref anyway.
      if (updated && updated !== prev) return updated;
      return prev;
    });
  }, [items]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    try {
      const newWs = await workspaceApi.createWorkspace({ name: newWorkspaceName.trim() });
      setActiveWorkspaceId(newWs.id);
      setCreateModalVisible(false);
      setNewWorkspaceName("");
      loadInitial();
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tạo workspace mới");
    }
  };

  const handleDeleteWorkspace = () => {
    Alert.alert(
      "Xóa Workspace",
      "Bạn có chắc chắn muốn xóa workspace này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: async () => {
            try {
              await workspaceApi.deleteWorkspace(activeWorkspaceId);
              setActiveWorkspaceId(""); // Reset active to load the first available one
              loadInitial();
            } catch (err) {
              Alert.alert("Lỗi", "Không thể xóa workspace");
            }
          }
        }
      ]
    );
  };
  
  const handleRenameWorkspace = async () => {
    if (!editWorkspaceName.trim()) return;
    try {
      await workspaceApi.updateWorkspace(activeWorkspaceId, { name: editWorkspaceName.trim() });
      setRenameModalVisible(false);
      loadInitial();
    } catch (e) { Alert.alert("Lỗi", "Không thể đổi tên"); }
  };

  const handleLeaveWorkspace = () => {
    Alert.alert("Xác nhận", "Bạn chắc chắn muốn rời khỏi workspace này?", [
      { text: "Hủy", style: "cancel" },
      { text: "Rời khỏi", style: "destructive", onPress: async () => {
        try {
          await workspaceApi.removeMember(activeWorkspaceId, user?.id || (user as any)?._id);
          setActiveWorkspaceId("");
          loadInitial();
        } catch(e) { Alert.alert("Lỗi", "Không thể rời khỏi"); }
      }}
    ]);
  };

  const handleWorkspaceSettings = () => {
    if (isOwner) {
      Alert.alert(
        "Tùy chọn Workspace",
        "Bạn muốn làm gì?",
        [
          { text: "Đổi tên", onPress: () => {
            setEditWorkspaceName(activeWorkspace?.name || "");
            setRenameModalVisible(true);
          }},
          { text: "Xóa Workspace", style: "destructive", onPress: handleDeleteWorkspace },
          { text: "Hủy", style: "cancel" }
        ]
      );
    } else {
      Alert.alert(
        "Tùy chọn Workspace",
        "Bạn muốn làm gì?",
        [
          { text: "Rời khỏi Workspace", style: "destructive", onPress: handleLeaveWorkspace },
          { text: "Hủy", style: "cancel" }
        ]
      );
    }
  };
  
  // KPIs
  const inProgressCount = items.filter(i => i.status === "doing").length;
  const pendingInvitesCount = invites.filter(i => i.workspaceId === activeWorkspaceId && i.status === "pending").length;

  if (loading) {
    return (
      <View style={[styles.safeArea, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconArrowLeft color={theme.ink} size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.titleArea} onPress={() => setShowSwitcher(!showSwitcher)}>
          <Text variant="heading" weight="bold" numberOfLines={1}>
            {activeWorkspace?.name || "Workspace"}
          </Text>
          <Text variant="sm" color="inkMuted">Đổi không gian làm việc ▼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={handleWorkspaceSettings}>
          <IconSettings color={theme.ink} size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setCreateModalVisible(true)}>
          <IconPlus color={theme.ink} size={24} />
        </TouchableOpacity>
      </View>

      {/* Workspace Switcher (Conditional) */}
      <Modal visible={showSwitcher} transparent animationType="fade" onRequestClose={() => setShowSwitcher(false)}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSwitcher(false)} />
        <View style={[styles.switcher, { backgroundColor: theme.surface }]}>
          {workspaces.map(w => (
            <TouchableOpacity 
              key={w.id} 
              style={[styles.switchItem, w.id === activeWorkspaceId && { backgroundColor: theme.surface2 }]}
              onPress={() => { setActiveWorkspaceId(w.id); setShowSwitcher(false); }}
            >
              <IconGrid color={w.id === activeWorkspaceId ? theme.primary : theme.inkMuted} size={20} />
              <Text style={{ marginLeft: 12, flex: 1 }} weight={w.id === activeWorkspaceId ? "bold" : "normal"}>
                {w.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* KPI Strip */}
      <View style={[styles.kpiStrip, { borderBottomColor: theme.border }]}>
        <View style={styles.kpiItem}>
          <Text variant="xs" color="inkMuted">Thành viên</Text>
          <Text variant="title" weight="bold">{members.length}</Text>
        </View>
        <View style={styles.kpiItem}>
          <Text variant="xs" color="inkMuted">Đang làm</Text>
          <Text variant="title" weight="bold">{inProgressCount}</Text>
        </View>
        <View style={styles.kpiItem}>
          <Text variant="xs" color="inkMuted">Lời mời chờ</Text>
          <Text variant="title" weight="bold">{pendingInvitesCount}</Text>
        </View>
      </View>

      {/* Mode Tabs */}
      <View style={{ borderBottomColor: theme.border, borderBottomWidth: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, mode === 'board' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]} onPress={() => setMode('board')}>
            <Text weight={mode === 'board' ? 'bold' : 'normal'} color={mode === 'board' ? 'primary' : 'inkMuted'}>Bảng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'members' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]} onPress={() => setMode('members')}>
            <Text weight={mode === 'members' ? 'bold' : 'normal'} color={mode === 'members' ? 'primary' : 'inkMuted'}>Thành viên</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'invites' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]} onPress={() => setMode('invites')}>
            <Text weight={mode === 'invites' ? 'bold' : 'normal'} color={mode === 'invites' ? 'primary' : 'inkMuted'}>Lời mời</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'papers' && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]} onPress={() => setMode('papers')}>
            <Text weight={mode === 'papers' ? 'bold' : 'normal'} color={mode === 'papers' ? 'primary' : 'inkMuted'}>Bài báo</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {mode === 'board' && canEdit && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <TouchableOpacity 
            style={{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }} 
            onPress={() => setTaskModalVisible(true)}
          >
            <Text color="surface" weight="bold">+ Thêm task</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Area */}
      <View style={{ flex: 1 }}>
        {mode === 'board' && <WorkspaceBoard items={items} onItemPress={setSelectedItem} refreshing={refreshingData} onRefresh={handleRefresh} />}
        {mode === 'members' && <WorkspaceMembers members={members} refreshing={refreshingData} onRefresh={handleRefresh} />}
        {mode === 'invites' && <WorkspaceInvites invites={invites} activeWorkspaceId={activeWorkspaceId} onRefresh={handleRefresh} />}
        {mode === 'papers' && <WorkspacePapers items={items} workspaceName={activeWorkspace?.name || "Workspace"} refreshing={refreshingData} onRefresh={handleRefresh} />}
      </View>

      {/* Create Workspace Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text variant="heading" weight="bold" style={{ marginBottom: 16 }}>Tạo Workspace mới</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              placeholder="Tên Workspace..."
              placeholderTextColor={theme.inkMuted}
              value={newWorkspaceName}
              onChangeText={setNewWorkspaceName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setCreateModalVisible(false)}>
                <Text color="inkMuted" weight="bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.btnSubmit, { backgroundColor: theme.primary }]} onPress={handleCreateWorkspace}>
                <Text color="surface" weight="bold">Tạo mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Workspace Modal */}
      <Modal visible={renameModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text variant="heading" weight="bold" style={{ marginBottom: 16 }}>Đổi tên Workspace</Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.ink }]}
              value={editWorkspaceName}
              onChangeText={setEditWorkspaceName}
              placeholder="Tên mới..."
              placeholderTextColor={theme.inkMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setRenameModalVisible(false)}>
                <Text color="inkMuted" weight="bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.btnSubmit, { backgroundColor: theme.primary }]} onPress={handleRenameWorkspace}>
                <Text color="surface" weight="bold">Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Modal */}
      {activeWorkspaceId && activeWorkspace && (
        <WorkspaceCreateTaskModal 
          visible={taskModalVisible}
          onClose={() => setTaskModalVisible(false)}
          workspaceId={activeWorkspaceId}
          workspaceName={activeWorkspace.name}
          members={members}
          onTaskCreated={() => {
            loadInitial();
            workspaceApi.items(activeWorkspaceId).then(setItems);
          }}
        />
      )}

      {selectedItem && activeWorkspaceId && (
        <TaskDetailModal
          visible={!!selectedItem}
          item={selectedItem}
          workspaceId={activeWorkspaceId}
          members={members}
          canEdit={canEdit}
          refreshing={refreshingData}
          onRefresh={async () => {
            setRefreshingData(true);
            await loadWorkspaceDetails(activeWorkspaceId);
            setRefreshingData(false);
          }}
          onClose={() => setSelectedItem(null)}
          onItemUpdated={() => {
            workspaceApi.items(activeWorkspaceId).then((newItems) => {
              setItems(newItems);
              setSelectedItem(prev => {
                if (!prev) return null;
                return newItems.find(i => i.id === prev.id) || prev;
              });
            });
          }}
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 12 },
  iconBtn: { padding: 4, marginLeft: 12 },
  titleArea: { flex: 1, justifyContent: 'center' },
  switcher: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 60 : 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 100,
    padding: 8,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  kpiStrip: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  kpiItem: { flex: 1, alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    padding: 24,
    borderRadius: 16,
    elevation: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnCancel: {
    backgroundColor: '#f3f4f6',
  },
  btnSubmit: {
    backgroundColor: '#3b82f6',
  }
});

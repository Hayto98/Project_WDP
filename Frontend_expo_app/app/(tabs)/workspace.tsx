import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform, StatusBar, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { Text } from '../../components/Text';
import { IconArrowLeft, IconPlus, IconGrid, IconTrash } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import { workspaceApi } from '../../lib/api';
import { type Workspace, type WorkspaceMember, type WorkspaceItem, type CollaborationInvite } from '../../lib/api';

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

  useEffect(() => {
    async function loadWorkspaceDetails() {
      if (!activeWorkspaceId) return;
      try {
        const mem = await workspaceApi.workspaceMembers(activeWorkspaceId);
        setMembers(mem);
        const it = await workspaceApi.items(activeWorkspaceId);
        setItems(it);
      } catch (err) {
        console.error("Failed to load workspace details", err);
      }
    }
    loadWorkspaceDetails();
  }, [activeWorkspaceId]);

  const activeWorkspace = useMemo(() => workspaces.find(w => w.id === activeWorkspaceId), [workspaces, activeWorkspaceId]);
  
  const isOwner = useMemo(() => {
    if (!user) return false;
    return members.some(m => m.id === user.id && m.role === 'owner');
  }, [members, user]);

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
        <TouchableOpacity style={styles.titleArea} onPress={() => setShowSwitcher(!showSwitcher)}>
          <Text variant="heading" weight="bold" numberOfLines={1}>
            {activeWorkspace?.name || "Workspace"}
          </Text>
          <Text variant="sm" color="inkMuted">Đổi không gian làm việc ▼</Text>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleDeleteWorkspace}>
            <IconTrash color={theme.danger} size={24} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => setCreateModalVisible(true)}>
          <IconPlus color={theme.ink} size={24} />
        </TouchableOpacity>
      </View>

      {/* Workspace Switcher (Conditional) */}
      {showSwitcher && (
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
      )}

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
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
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
      </View>

      {mode === 'board' && (
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
        {mode === 'board' && <WorkspaceBoard items={items} onItemPress={setSelectedItem} />}
        {mode === 'members' && <WorkspaceMembers members={members} />}
        {mode === 'invites' && <WorkspaceInvites invites={invites} activeWorkspaceId={activeWorkspaceId} onRefresh={loadInitial} />}
        {mode === 'papers' && <WorkspacePapers items={items} workspaceName={activeWorkspace?.name || "Workspace"} />}
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
              <TouchableOpacity style={styles.modalBtn} onPress={() => setCreateModalVisible(false)}>
                <Text color="inkMuted">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleCreateWorkspace}>
                <Text color="surface" weight="bold">Tạo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
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
  }
});

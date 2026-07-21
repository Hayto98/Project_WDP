import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationApi, type NotificationItem, API_BASE_URL } from '../lib/api';
import { useAuth } from './AuthContext';
import { io, Socket } from 'socket.io-client';

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsReadLocally: (id: string) => void;
  markAllAsReadLocally: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const items = await notificationApi.list();
      setNotifications(items);
    } catch (e) {
      console.error(e);
      setNotifications([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchNotifications().finally(() => setLoading(false));
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const userId = user?.id || (user as any)?._id;
    if (!userId) return;

    const backendUrl = API_BASE_URL.replace("/api/v1", "");
    const socket: Socket = io(backendUrl, { transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      socket.emit("join_user", userId);
    });

    socket.on("new_notification", () => {
      fetchNotifications();
    });

    return () => {
      socket.emit("leave_user", userId);
      socket.disconnect();
    };
  }, [user, fetchNotifications]);

  const markAsReadLocally = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  }, []);

  const markAllAsReadLocally = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, fetchNotifications, markAsReadLocally, markAllAsReadLocally }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Activity, Notification, Task } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineCount: number;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  activities: Activity[];
  latestTaskUpdate: Task | null;
  notifications: Notification[];
  unreadNotificationCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setUnreadNotificationCount: React.Dispatch<React.SetStateAction<number>>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [latestTaskUpdate, setLatestTaskUpdate] = useState<Task | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Initialize socket when authenticated
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const s = io('http://localhost:4000', {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Presence update
    s.on('presence:update', (data: { onlineCount: number }) => {
      setOnlineCount(data.onlineCount);
    });

    // Real-time activity feed
    s.on('activity:new', (newActivity: Activity) => {
      setActivities((prev) => [newActivity, ...prev.slice(0, 49)]);
    });

    // Live task update
    s.on('task:updated', (updatedTask: Task) => {
      setLatestTaskUpdate(updatedTask);
    });

    // Real-time notifications
    s.on('notification:new', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotificationCount((count) => count + 1);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user]);

  const joinProject = (projectId: string) => {
    if (socket && projectId) {
      socket.emit('join:project', projectId);
    }
  };

  const leaveProject = (projectId: string) => {
    if (socket && projectId) {
      socket.emit('leave:project', projectId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineCount,
        joinProject,
        leaveProject,
        activities,
        latestTaskUpdate,
        notifications,
        unreadNotificationCount,
        setNotifications,
        setUnreadNotificationCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

import { ApiService } from './api';
import { Project, Task, Activity, Notification, Client, User, TaskStatus, TaskPriority } from '../types';

export const ProjectService = {
  list: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: Project[] }>('/projects');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await ApiService.fetch<{ success: boolean; data: Project }>(`/projects/${id}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string; clientId: string }) => {
    const res = await ApiService.fetch<{ success: boolean; data: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  update: async (id: string, data: { name?: string; description?: string }) => {
    const res = await ApiService.fetch<{ success: boolean; data: Project }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await ApiService.fetch<{ success: boolean; data: any }>(`/projects/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};

export const TaskService = {
  list: async (filters: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const params = new URLSearchParams();
    if (filters.projectId) params.set('projectId', filters.projectId);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await ApiService.fetch<{ success: boolean; data: Task[] }>(`/tasks${query}`);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await ApiService.fetch<{ success: boolean; data: Task }>(`/tasks/${id}`);
    return res.data;
  },
  create: async (data: {
    projectId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    assignedDeveloperId?: string;
  }) => {
    const res = await ApiService.fetch<{ success: boolean; data: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  updateStatus: async (id: string, status: TaskStatus) => {
    const res = await ApiService.fetch<{ success: boolean; data: Task }>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },
  update: async (id: string, data: Partial<Task>) => {
    const res = await ApiService.fetch<{ success: boolean; data: Task }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await ApiService.fetch<{ success: boolean; data: any }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};

export const DashboardService = {
  getDashboard: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: any }>('/dashboard');
    return res.data;
  },
};

export const ActivityService = {
  list: async (limit = 20) => {
    const res = await ApiService.fetch<{ success: boolean; data: Activity[] }>(`/activity?limit=${limit}`);
    return res.data;
  },
};

export const NotificationService = {
  list: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: { notifications: Notification[]; unreadCount: number } }>(
      '/notifications',
    );
    return res.data;
  },
  markAsRead: async (id: string) => {
    const res = await ApiService.fetch<{ success: boolean; data: Notification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: any }>('/notifications/read-all', {
      method: 'POST',
    });
    return res.data;
  },
};

export const ClientService = {
  list: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: Client[] }>('/clients');
    return res.data;
  },
};

export const UserService = {
  listDevelopers: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: User[] }>('/users/developers');
    return res.data;
  },
  listAll: async () => {
    const res = await ApiService.fetch<{ success: boolean; data: User[] }>('/users');
    return res.data;
  },
};

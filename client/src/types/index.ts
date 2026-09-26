export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  contactInfo?: string | null;
  createdAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  createdBy?: { id: string; name: string; email: string };
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string;
  assignedDeveloperId: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; createdById?: string };
  assignedDeveloper?: { id: string; name: string; email: string } | null;
}

export interface Activity {
  id: string;
  projectId?: string | null;
  taskId?: string | null;
  userId: string;
  action: string;
  previousStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  details?: string | null;
  createdAt: string;
  formattedMessage?: string;
  user: { id: string; name: string; email: string; role: UserRole };
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  taskId?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  role: UserRole;
  metrics: any;
}

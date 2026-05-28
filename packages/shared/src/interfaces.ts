export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  avatarUrl?: string;
  isActive: boolean;
  timezone: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isArchived: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId?: string;
  description?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  isRunning: boolean;
  createdAt: string;
}

export interface Screenshot {
  id: string;
  userId: string;
  timeEntryId?: string;
  storagePath: string;
  capturedAt: string;
  activityPercent: number;
  signedUrl?: string;
  createdAt: string;
}

export interface AppConfig {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  statusCode: number;
}

export interface DashboardStats {
  totalHoursToday: number;
  activeEmployeesNow: number;
  screenshotsTakenToday: number;
  weeklyHours: number;
  lastWeeklyHours: number;
}

export interface ProjectStats {
  projectId: string;
  totalHours: number;
  activeMembers: number;
  screenshotCount: number;
}

export interface ActivityWindow {
  startTime: string;
  endTime: string;
  activeSeconds: number;
  activityPercent: number;
  isIdle: boolean;
}

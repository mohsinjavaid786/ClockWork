export type UserRole = 'admin' | 'member';
// An open entry is 'running' or 'paused'; 'stopped' is terminal. 'paused' is a
// real persisted status (migration 005), not just a UI state.
export type EntryStatus = 'running' | 'paused' | 'stopped';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  timezone: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  isArchived: boolean;
  createdBy: string;
  totalHours?: number;
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
  status: EntryStatus;
  user?: User;
  project?: Project;
}

export interface MinuteActivity {
  t: string; // ISO8601 start of the minute
  keys: number;
  mouse: number;
  window?: string;
}

export interface Screenshot {
  id: string;
  userId: string;
  timeEntryId?: string | null;
  storagePath: string;
  capturedAt: string;
  activityPercent: number;
  screenNumber: number;
  displayCount: number;
  keyCount?: number;
  mouseCount?: number;
  activeWindow?: string | null;
  minuteActivity?: MinuteActivity[];
  signedUrl?: string;
  // Small grid thumbnail; absent until generated/backfilled.
  thumbnailUrl?: string;
  user?: User;
}

export interface AppConfig {
  screenshotIntervalMinutes: number;
  companyName: string;
  timezone: string;
  slackWebhookUrl?: string;
}

export interface DashboardStats {
  todayHours: number;
  activeNow: number;
  screenshotsToday: number;
  weeklyHours: number;
  weeklyChange: number;
}

export interface ActiveMember {
  userId: string;
  name: string;
  email: string;
  projectName?: string;
  description?: string;
  elapsedSeconds: number;
  startedAt: string;
}

export interface WeeklyChartData {
  day: string;
  date: string;
  hours: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  statusCode: number;
  message?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'member';
  };
}

export interface InviteUserDto {
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface UpdateUserDto {
  name?: string;
  role?: 'admin' | 'member';
  isActive?: boolean;
  timezone?: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  color?: string;
  isArchived?: boolean;
}

export interface StartTimeEntryDto {
  projectId?: string;
  description?: string;
}

export interface StopTimeEntryDto {
  entryId: string;
}

export interface UploadScreenshotDto {
  timeEntryId?: string;
  activityPercent: number;
  capturedAt: string;
}

export interface TimeEntriesQueryDto {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface ReportsQueryDto {
  startDate: string;
  endDate: string;
  userIds?: string[];
  projectIds?: string[];
}

export interface UpdateConfigDto {
  screenshotIntervalMinutes?: number;
  companyName?: string;
  timezone?: string;
  slackWebhookUrl?: string;
}

// Shared client-side types mirroring the API responses.

export interface MinuteActivity {
  t: string; // ISO8601 start of the minute
  keys: number;
  mouse: number;
  window?: string;
}

export interface Screenshot {
  id: string;
  userId: string;
  timeEntryId: string | null;
  storagePath: string;
  capturedAt: string;
  activityPercent: number;
  screenNumber: number;
  displayCount: number;
  keyCount: number;
  mouseCount: number;
  activeWindow: string | null;
  minuteActivity: MinuteActivity[];
  user: { id: string; name: string; email: string } | null;
  signedUrl?: string;
  thumbnailUrl?: string;
}

// Per-day aggregate used by the Work Diary calendar + week bars.
export interface DayMeta {
  hours: number;
  hasOvertime: boolean;
  entryCount: number;
}

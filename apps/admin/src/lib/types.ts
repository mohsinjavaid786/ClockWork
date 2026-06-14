// Shared client-side types mirroring the API responses.

export interface Screenshot {
  id: string;
  userId: string;
  timeEntryId: string | null;
  storagePath: string;
  capturedAt: string;
  activityPercent: number;
  screenNumber: number;
  displayCount: number;
  user: { id: string; name: string; email: string } | null;
  signedUrl?: string;
}

// Per-day aggregate used by the Work Diary calendar + week bars.
export interface DayMeta {
  hours: number;
  hasOvertime: boolean;
  entryCount: number;
}

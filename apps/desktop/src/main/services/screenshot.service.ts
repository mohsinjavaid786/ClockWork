import { desktopCapturer, screen } from 'electron';
import { getToken } from './timer.service';
import type { ActivitySnapshot } from './activity.service';
import { API_BASE } from '../config';

export async function captureAndUpload(
  userId: string,
  activity: ActivitySnapshot,
  timeEntryId?: string,
): Promise<void> {
  const primary = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.max(1920, primary.size.width),
      height: Math.max(1080, primary.size.height),
    },
  });

  if (sources.length === 0) return;

  const token = getToken();
  if (!token) return;

  const capturedAt = new Date().toISOString();
  const displayCount = sources.length;

  await Promise.all(
    sources.map(async (source, idx) => {
      const pngBuffer = source.thumbnail.toPNG();

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([new Uint8Array(pngBuffer)], { type: 'image/png' }),
        `screen-${idx + 1}.png`,
      );
      formData.append('activityPercent', String(activity.activityPercent));
      formData.append('keyCount', String(activity.keyCount));
      formData.append('mouseCount', String(activity.mouseCount));
      formData.append('minuteActivity', JSON.stringify(activity.minuteActivity));
      if (activity.activeWindow) formData.append('activeWindow', activity.activeWindow);
      formData.append('screenNumber', String(idx + 1));
      formData.append('displayCount', String(displayCount));
      formData.append('capturedAt', capturedAt);
      if (timeEntryId) formData.append('timeEntryId', timeEntryId);

      const res = await fetch(`${API_BASE}/api/v1/screenshots/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        console.error(`Screenshot upload failed (screen ${idx + 1}): HTTP ${res.status}`);
      } else {
        console.log(`Screenshot uploaded (screen ${idx + 1}/${displayCount}, ${pngBuffer.length} bytes)`);
      }
    }),
  );

  void userId;
}

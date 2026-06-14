import { desktopCapturer, screen } from 'electron';
import { getToken } from './timer.service';

const API_BASE = process.env['API_URL'] ?? 'http://localhost:3001';

export async function captureAndUpload(
  userId: string,
  activityPercent: number,
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
      formData.append('activityPercent', String(activityPercent));
      formData.append('screenNumber', String(idx + 1));
      formData.append('displayCount', String(displayCount));
      formData.append('capturedAt', capturedAt);
      if (timeEntryId) formData.append('timeEntryId', timeEntryId);

      await fetch(`${API_BASE}/api/v1/screenshots/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }),
  );

  void userId;
}

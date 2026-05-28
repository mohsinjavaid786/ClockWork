import { desktopCapturer } from 'electron';
import { getToken } from './timer.service';

const API_BASE = process.env['API_URL'] ?? 'http://localhost:3001';

export async function captureAndUpload(
  userId: string,
  activityPercent: number,
  timeEntryId?: string,
): Promise<void> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1280, height: 720 },
  });

  const source = sources[0];
  if (!source) return;

  const thumbnail = source.thumbnail;
  const pngBuffer = thumbnail.toPNG();

  let processedBuffer: Buffer = pngBuffer;

  try {
    const sharp = (await import('sharp')).default;
    processedBuffer = await sharp(pngBuffer).blur(3).png().toBuffer();
  } catch {
    processedBuffer = pngBuffer;
  }

  const token = getToken();
  if (!token) return;

  const formData = new FormData();
  formData.append('file', new Blob([new Uint8Array(processedBuffer)], { type: 'image/png' }), 'screenshot.png');
  formData.append('activityPercent', String(activityPercent));
  if (timeEntryId) formData.append('timeEntryId', timeEntryId);

  await fetch(`${API_BASE}/api/v1/screenshots/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  void userId;
}

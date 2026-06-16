import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { SupabaseService } from '../../supabase/supabase.service';
import { UploadScreenshotDto, ListScreenshotsQueryDto } from './dto/screenshot.dto';

// Grid thumbnails: small JPEGs so the portal never downloads multi-MB full-res
// PNGs just to render a tile. Full images stay raw for the detail modal.
const THUMB_WIDTH = 480;
const THUMB_QUALITY = 65;

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Resize a full-image buffer to a small JPEG thumbnail. Best-effort: returns
  // null on any failure so callers can fall back rather than fail the request.
  private async makeThumb(buffer: Buffer): Promise<Buffer | null> {
    try {
      return await sharp(buffer)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Thumbnail generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  async upload(
    userId: string,
    file: Express.Multer.File | undefined,
    thumbnail: Express.Multer.File | undefined,
    dto: UploadScreenshotDto,
  ) {
    if (!file) throw new BadRequestException('No screenshot file uploaded');

    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const screenSuffix = dto.screenNumber ? `-screen-${dto.screenNumber}` : '';
    const stamp = Date.now();
    const path = `${userId}/${stamp}${screenSuffix}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('screenshots')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) throw new BadRequestException(uploadError.message);

    // Always have a small thumbnail for the grid. Prefer the client-provided one
    // (saves a resize); otherwise generate it server-side from the full image so
    // thumbnails exist regardless of which desktop build captured the screenshot.
    let thumbnailPath: string | null = null;
    const thumbBuffer = thumbnail?.buffer ?? (await this.makeThumb(file.buffer));
    if (thumbBuffer) {
      const tPath = `${userId}/thumbs/${stamp}${screenSuffix}.jpg`;
      const { error: tErr } = await this.supabase.client.storage
        .from('screenshots')
        .upload(tPath, thumbBuffer, { contentType: 'image/jpeg', upsert: false });
      if (!tErr) thumbnailPath = tPath;
    }

    let minuteActivity: unknown = [];
    if (dto.minuteActivity) {
      try {
        const parsed = JSON.parse(dto.minuteActivity);
        if (Array.isArray(parsed)) minuteActivity = parsed;
      } catch {
        // ignore malformed per-minute payloads — store empty rather than fail the upload
      }
    }

    const { data, error } = await this.supabase.client
      .from('screenshots')
      .insert({
        user_id: userId,
        time_entry_id: dto.timeEntryId ?? null,
        storage_path: path,
        thumbnail_path: thumbnailPath,
        activity_percent: dto.activityPercent,
        captured_at: dto.capturedAt ?? new Date().toISOString(),
        screen_number: dto.screenNumber ?? 1,
        display_count: dto.displayCount ?? 1,
        key_count: dto.keyCount ?? 0,
        mouse_count: dto.mouseCount ?? 0,
        active_window: dto.activeWindow ?? null,
        minute_activity: minuteActivity,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async list(query: ListScreenshotsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let q = this.supabase.client
      .from('screenshots')
      .select(
        'id, user_id, time_entry_id, storage_path, thumbnail_path, captured_at, activity_percent, screen_number, display_count, key_count, mouse_count, active_window, minute_activity, user:users(id, name, email)',
        { count: 'exact' },
      )
      .order('captured_at', { ascending: false })
      .order('screen_number', { ascending: true })
      .range(offset, offset + limit - 1);

    if (query.userId) q = q.eq('user_id', query.userId);
    if (query.from) q = q.gte('captured_at', query.from);
    if (query.to) q = q.lte('captured_at', query.to);

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);

    // Batch-sign full images + thumbnails in one round-trip each.
    const fullPaths = (data ?? []).map((s) => s.storage_path as string);
    const thumbPaths = (data ?? [])
      .map((s) => s.thumbnail_path as string | null)
      .filter((p): p is string => !!p);

    const [{ data: fullSigned }, { data: thumbSigned }] = await Promise.all([
      fullPaths.length
        ? this.supabase.client.storage.from('screenshots').createSignedUrls(fullPaths, 3600)
        : Promise.resolve({ data: [] as { path?: string | null; signedUrl: string }[] }),
      thumbPaths.length
        ? this.supabase.client.storage.from('screenshots').createSignedUrls(thumbPaths, 3600)
        : Promise.resolve({ data: [] as { path?: string | null; signedUrl: string }[] }),
    ]);

    const fullMap = new Map((fullSigned ?? []).map((u) => [u.path, u.signedUrl]));
    const thumbMap = new Map((thumbSigned ?? []).map((u) => [u.path, u.signedUrl]));

    const withUrls = (data ?? []).map((s) => {
      const signedUrl = fullMap.get(s.storage_path as string);
      // Null (not the full image) when there's no real thumbnail yet, so the grid
      // shows a skeleton instead of downloading a multi-MB PNG per tile. Backfill
      // populates thumbnail_path for older screenshots.
      const thumbnailUrl = s.thumbnail_path ? thumbMap.get(s.thumbnail_path as string) ?? null : null;
      return { ...s, signedUrl, thumbnailUrl };
    });

    const total = count ?? 0;
    return {
      data: withUrls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Generate + store thumbnails for existing screenshots that don't have one
  // (captured by older desktop builds). Processed in bounded batches so the
  // request can't time out; returns how many were done and how many remain.
  // Optional filters let a caller (e.g. the drawer) prioritise one entry's window.
  async backfillThumbnails(
    limit = 25,
    filters?: { userId?: string; from?: string; to?: string },
  ) {
    let q = this.supabase.client
      .from('screenshots')
      .select('id, user_id, storage_path')
      .is('thumbnail_path', null);
    if (filters?.userId) q = q.eq('user_id', filters.userId);
    if (filters?.from) q = q.gte('captured_at', filters.from);
    if (filters?.to) q = q.lte('captured_at', filters.to);

    const { data: rows, error } = await q
      .order('captured_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    if (!rows || rows.length === 0) return { processed: 0, remaining: 0 };

    let processed = 0;
    for (const row of rows) {
      try {
        const { data: blob, error: dlErr } = await this.supabase.client.storage
          .from('screenshots')
          .download(row.storage_path as string);
        if (dlErr || !blob) continue;

        const thumb = await this.makeThumb(Buffer.from(await blob.arrayBuffer()));
        if (!thumb) continue;

        const stamp = (row.storage_path as string).split('/').pop()?.replace(/\.[^.]+$/, '') ?? row.id;
        const tPath = `${row.user_id}/thumbs/${stamp}.jpg`;
        const { error: upErr } = await this.supabase.client.storage
          .from('screenshots')
          .upload(tPath, thumb, { contentType: 'image/jpeg', upsert: true });
        if (upErr) continue;

        await this.supabase.client
          .from('screenshots')
          .update({ thumbnail_path: tPath })
          .eq('id', row.id);
        processed++;
      } catch (err) {
        this.logger.warn(`Backfill failed for ${row.id}: ${(err as Error).message}`);
      }
    }

    let cq = this.supabase.client
      .from('screenshots')
      .select('id', { count: 'exact', head: true })
      .is('thumbnail_path', null);
    if (filters?.userId) cq = cq.eq('user_id', filters.userId);
    if (filters?.from) cq = cq.gte('captured_at', filters.from);
    if (filters?.to) cq = cq.lte('captured_at', filters.to);
    const { count } = await cq;

    return { processed, remaining: count ?? 0 };
  }

  async getSignedUrl(id: string) {
    const { data, error } = await this.supabase.client
      .from('screenshots')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException('Screenshot not found');

    const { data: urlData } = await this.supabase.client.storage
      .from('screenshots')
      .createSignedUrl(data.storage_path as string, 3600);

    return { signedUrl: urlData?.signedUrl };
  }
}

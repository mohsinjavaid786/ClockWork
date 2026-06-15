import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UploadScreenshotDto, ListScreenshotsQueryDto } from './dto/screenshot.dto';

@Injectable()
export class ScreenshotsService {
  constructor(private readonly supabase: SupabaseService) {}

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

    // Upload the small thumbnail (best-effort; a failure just means the grid
    // falls back to the full image).
    let thumbnailPath: string | null = null;
    if (thumbnail) {
      const tPath = `${userId}/thumbs/${stamp}${screenSuffix}.jpg`;
      const { error: tErr } = await this.supabase.client.storage
        .from('screenshots')
        .upload(tPath, thumbnail.buffer, { contentType: 'image/jpeg', upsert: false });
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
      const thumbnailUrl = s.thumbnail_path
        ? thumbMap.get(s.thumbnail_path as string)
        : signedUrl; // fall back to full image for pre-thumbnail screenshots
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

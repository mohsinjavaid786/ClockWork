import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UploadScreenshotDto, ListScreenshotsQueryDto } from './dto/screenshot.dto';

@Injectable()
export class ScreenshotsService {
  constructor(private readonly supabase: SupabaseService) {}

  async upload(userId: string, file: Express.Multer.File, dto: UploadScreenshotDto) {
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const screenSuffix = dto.screenNumber ? `-screen-${dto.screenNumber}` : '';
    const path = `${userId}/${Date.now()}${screenSuffix}.${ext}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('screenshots')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) throw new BadRequestException(uploadError.message);

    const { data, error } = await this.supabase.client
      .from('screenshots')
      .insert({
        user_id: userId,
        time_entry_id: dto.timeEntryId ?? null,
        storage_path: path,
        activity_percent: dto.activityPercent,
        captured_at: dto.capturedAt ?? new Date().toISOString(),
        screen_number: dto.screenNumber ?? 1,
        display_count: dto.displayCount ?? 1,
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
        'id, user_id, time_entry_id, storage_path, captured_at, activity_percent, screen_number, display_count, user:users(id, name, email)',
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

    const withUrls = await Promise.all(
      (data ?? []).map(async (s) => {
        const { data: urlData } = await this.supabase.client.storage
          .from('screenshots')
          .createSignedUrl(s.storage_path as string, 3600);
        return { ...s, signedUrl: urlData?.signedUrl };
      }),
    );

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

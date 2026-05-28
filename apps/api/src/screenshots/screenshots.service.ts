import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../common/supabase/supabase.service';

export interface UploadScreenshotMeta {
  userId: string;
  timeEntryId?: string;
  activityPercent: number;
  capturedAt: string;
}

@Injectable()
export class ScreenshotsService {
  private readonly logger = new Logger(ScreenshotsService.name);
  private readonly bucket = process.env.STORAGE_BUCKET ?? 'screenshots';

  constructor(private readonly supabase: SupabaseService) {}

  async upload(file: Buffer, meta: UploadScreenshotMeta) {
    const date = meta.capturedAt.split('T')[0];
    const timestamp = new Date(meta.capturedAt).getTime();
    const storagePath = `${meta.userId}/${date}/${timestamp}.jpg`;

    const { error: uploadError } = await this.supabase.client.storage
      .from(this.bucket)
      .upload(storagePath, file, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await this.supabase.client
      .from('screenshots')
      .insert({
        user_id: meta.userId,
        time_entry_id: meta.timeEntryId ?? null,
        storage_path: storagePath,
        captured_at: meta.capturedAt,
        activity_percent: meta.activityPercent,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    this.logger.log(`Screenshot uploaded for user ${meta.userId}`);
    return data;
  }

  async findAll(userId?: string, startDate?: string, endDate?: string, isAdmin = false) {
    let query = this.supabase.client
      .from('screenshots')
      .select('*')
      .order('captured_at', { ascending: false });

    if (!isAdmin && userId) query = query.eq('user_id', userId) as typeof query;
    else if (userId) query = query.eq('user_id', userId) as typeof query;
    if (startDate) query = query.gte('captured_at', startDate) as typeof query;
    if (endDate) query = query.lte('captured_at', endDate) as typeof query;

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const screenshots = data ?? [];
    const withUrls = await Promise.all(
      screenshots.map(async (s: { storage_path: string; id: string; [key: string]: unknown }) => {
        const { data: signedData } = await this.supabase.client.storage
          .from(this.bucket)
          .createSignedUrl(s.storage_path, 3600);
        return { ...s, signedUrl: signedData?.signedUrl ?? null };
      }),
    );
    return withUrls;
  }

  async getFullUrl(id: string) {
    const { data, error } = await this.supabase.client
      .from('screenshots')
      .select('storage_path')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`Screenshot ${id} not found`);

    const { data: signedData } = await this.supabase.client.storage
      .from(this.bucket)
      .createSignedUrl(data.storage_path, 3600);

    return { signedUrl: signedData?.signedUrl };
  }
}

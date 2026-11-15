import { ScreenshotsService } from './screenshots.service';
import { SupabaseService } from '../../supabase/supabase.service';

describe('Screenshot ownership', () => {
  it('rejects another user’s time entry before writing any files', async () => {
    const query = {
      select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'screenshot' }, error: null }),
    };
    const upload = jest.fn().mockResolvedValue({ error: null });
    const supabase = { client: {
      from: jest.fn().mockReturnValue(query),
      storage: { from: jest.fn().mockReturnValue({ upload }) },
    } } as unknown as SupabaseService;
    const service = new ScreenshotsService(supabase);
    const file = { buffer: Buffer.from('image'), mimetype: 'image/png' } as Express.Multer.File;
    await expect(service.upload('member-a', file, file, {
      timeEntryId: 'entry-owned-by-member-b', activityPercent: 10,
    })).rejects.toThrow('Time entry not found');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'member-a');
    expect(upload).not.toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScreenshotsService } from './screenshots.service';
import { SupabaseService } from '../common/supabase/supabase.service';

describe('ScreenshotsService', () => {
  let service: ScreenshotsService;
  const mockFrom = jest.fn();
  const mockStorage = {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockResolvedValue({ error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'http://signed.url' } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenshotsService,
        {
          provide: SupabaseService,
          useValue: { client: { from: mockFrom, storage: mockStorage } },
        },
      ],
    }).compile();
    service = module.get<ScreenshotsService>(ScreenshotsService);
  });

  it('throws NotFoundException for missing screenshot', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });
    await expect(service.getFullUrl('missing')).rejects.toThrow(NotFoundException);
  });
});

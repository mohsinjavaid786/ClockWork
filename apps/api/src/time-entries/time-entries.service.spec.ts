import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { SupabaseService } from '../common/supabase/supabase.service';

const buildQueryChain = (overrides: Record<string, unknown> = {}) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
  ...overrides,
});

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  const mockFrom = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeEntriesService,
        {
          provide: SupabaseService,
          useValue: { client: { from: mockFrom } },
        },
      ],
    }).compile();
    service = module.get<TimeEntriesService>(TimeEntriesService);
  });

  it('throws if timer already running on start', async () => {
    const chain = buildQueryChain({
      single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
    });
    mockFrom.mockReturnValue(chain);
    await expect(service.start('uid', {})).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException on stop with no running timer', async () => {
    const chain = buildQueryChain({
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });
    mockFrom.mockReturnValue(chain);
    await expect(service.stop('uid', {})).rejects.toThrow(NotFoundException);
  });
});

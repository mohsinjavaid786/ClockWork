import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { SupabaseService } from '../common/supabase/supabase.service';

const mockFrom = jest.fn();
const mockSupabase = {
  client: {
    from: mockFrom,
    auth: { admin: { createUser: jest.fn() } },
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('throws NotFoundException for missing user', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });
    await expect(service.findOne('unknown')).rejects.toThrow(NotFoundException);
  });

  it('returns user on findOne', async () => {
    const fakeUser = { id: '1', name: 'Alice', email: 'a@b.com', role: 'member' };
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeUser, error: null }),
    });
    const result = await service.findOne('1');
    expect(result.name).toBe('Alice');
  });
});

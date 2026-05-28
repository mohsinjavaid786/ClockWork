import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseService } from '../common/supabase/supabase.service';

const mockSupabase = {
  client: {
    auth: {
      signInWithPassword: jest.fn(),
      admin: { signOut: jest.fn() },
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: mockSupabase },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('returns token on valid credentials', async () => {
    mockSupabase.client.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'tok' },
        user: { id: 'uid', email: 'a@b.com' },
      },
      error: null,
    });
    mockSupabase.client.single.mockResolvedValue({
      data: { name: 'Alice', role: 'member', is_active: true },
    });
    const result = await service.login('a@b.com', 'pass123');
    expect(result.accessToken).toBe('tok');
    expect(result.user.role).toBe('member');
  });

  it('throws on invalid credentials', async () => {
    mockSupabase.client.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('invalid'),
    });
    await expect(service.login('a@b.com', 'wrong')).rejects.toThrow(UnauthorizedException);
  });
});

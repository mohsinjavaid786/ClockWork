import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { SupabaseService } from '../common/supabase/supabase.service';

const mockFrom = jest.fn();

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: SupabaseService, useValue: { client: { from: mockFrom } } },
      ],
    }).compile();
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('throws NotFoundException for missing project', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
    });
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

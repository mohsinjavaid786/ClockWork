import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects with total hours' })
  list() {
    return this.projectsService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID with stats' })
  findById(@Param('id') id: string) {
    return this.projectsService.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projectsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update project' })
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}

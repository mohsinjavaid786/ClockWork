import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AuthUser } from '../../guards/supabase-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users with weekly hours' })
  list() {
    return this.usersService.list();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID with stats' })
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('invite')
  @Roles('admin')
  @ApiOperation({ summary: 'Invite a new user' })
  invite(@Body() dto: InviteUserDto) {
    return this.usersService.invite(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user role, status, or timezone' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a user and all their data (entries + screenshots)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.usersService.remove(id, user.id);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// Gestão de usuários restrita a Owner/Manager — Requisito 2.5.
@Roles(Role.OWNER, Role.MANAGER)
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.users.list(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(user.tenantId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(user.tenantId, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.users.remove(user.tenantId, id);
  }
}

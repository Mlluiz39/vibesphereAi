import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { AgentService } from './agent.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanLimitGuard } from '../billing/plan-limit.guard';
import { EnforcePlanLimit } from '../billing/decorators/plan-limit.decorator';

@Controller('agents')
export class AgentController {
  constructor(private readonly agents: AgentService) {}

  // Leitura disponível para qualquer perfil autenticado do tenant.
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.agents.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.agents.get(user.tenantId, id);
  }

  // Criação restrita a Owner/Manager e sujeita ao limite do plano — Req 5.2/5.3.
  @Roles(Role.OWNER, Role.MANAGER)
  @UseGuards(PlanLimitGuard)
  @EnforcePlanLimit('agents')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAgentDto) {
    return this.agents.create(user.tenantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agents.update(user.tenantId, id, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(204)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.agents.remove(user.tenantId, id);
  }
}

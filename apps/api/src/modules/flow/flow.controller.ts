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
} from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { FlowService } from './flow.service';
import { RunFlowDto, UpdateFlowStatusDto, UpsertFlowDto } from './dto/flow.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('flows')
export class FlowController {
  constructor(private readonly flows: FlowService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.flows.listFlows(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.flows.getFlow(user.tenantId, id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: UpsertFlowDto) {
    return this.flows.createFlow(user.tenantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id/status')
  status(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowStatusDto,
  ) {
    return this.flows.updateStatus(user.tenantId, id, dto.status);
  }

  @Post(':id/run')
  run(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RunFlowDto,
  ) {
    return this.flows.run(user.tenantId, id, dto);
  }

  @Get(':id/runs')
  runs(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.flows.listRuns(user.tenantId, id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(204)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.flows.deleteFlow(user.tenantId, id);
  }
}

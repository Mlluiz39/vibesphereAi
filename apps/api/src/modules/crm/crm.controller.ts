import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { CrmService } from './crm.service';
import {
  CreateLeadDto,
  CreateOpportunityDto,
  CreatePipelineDto,
  ListLeadsQuery,
  MoveStageDto,
  UpdateLeadDto,
} from './dto/crm.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  // ---- Leads ----

  @Get('leads')
  listLeads(@CurrentUser() user: AuthUser, @Query() query: ListLeadsQuery) {
    return this.crm.listLeads(user.tenantId, query.status);
  }

  @Post('leads')
  createLead(@CurrentUser() user: AuthUser, @Body() dto: CreateLeadDto) {
    return this.crm.createLead(user.tenantId, dto);
  }

  @Patch('leads/:id')
  updateLead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.crm.updateLead(user.tenantId, id, dto);
  }

  // ---- Pipelines ----

  @Get('pipelines')
  listPipelines(@CurrentUser() user: AuthUser) {
    return this.crm.listPipelines(user.tenantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pipelines')
  createPipeline(@CurrentUser() user: AuthUser, @Body() dto: CreatePipelineDto) {
    return this.crm.createPipeline(user.tenantId, dto);
  }

  // ---- Oportunidades ----

  @Get('opportunities')
  listOpportunities(@CurrentUser() user: AuthUser, @Query('pipelineId') pipelineId?: string) {
    return this.crm.listOpportunities(user.tenantId, pipelineId);
  }

  @Post('opportunities')
  createOpportunity(@CurrentUser() user: AuthUser, @Body() dto: CreateOpportunityDto) {
    return this.crm.createOpportunity(user.tenantId, dto);
  }

  @Patch('opportunities/:id/stage')
  moveStage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.crm.moveStage(user.tenantId, id, dto.stageId, user.sub);
  }
}

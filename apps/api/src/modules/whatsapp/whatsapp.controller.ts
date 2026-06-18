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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@vibesphere/shared';
import { WhatsAppService } from './whatsapp.service';
import { CreateChannelDto, UpdateChannelDto } from './dto/whatsapp.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PlanLimitGuard } from '../billing/plan-limit.guard';
import { EnforcePlanLimit } from '../billing/decorators/plan-limit.decorator';

@Controller()
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  // ---- Canais (autenticado, escopado por tenant) ----

  @Get('whatsapp-channels')
  list(@CurrentUser() user: AuthUser) {
    return this.whatsapp.listChannels(user.tenantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @UseGuards(PlanLimitGuard)
  @EnforcePlanLimit('whatsappChannels')
  @Post('whatsapp-channels')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    return this.whatsapp.createChannel(user.tenantId, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('whatsapp-channels/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.whatsapp.updateChannel(user.tenantId, id, dto);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(204)
  @Delete('whatsapp-channels/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.whatsapp.removeChannel(user.tenantId, id);
  }

  // ---- Webhook (público; identificado por channelId na URL) ----

  @Public()
  @Get('webhooks/whatsapp/:channelId')
  async verify(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    return this.whatsapp.verifyChallenge(channelId, query);
  }

  @Public()
  @HttpCode(200)
  @Post('webhooks/whatsapp/:channelId')
  async inbound(
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
  ) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    return this.whatsapp.handleInbound(channelId, rawBody, signature, body);
  }
}

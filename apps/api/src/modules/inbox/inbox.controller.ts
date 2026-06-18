import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { InboxService } from './inbox.service';
import {
  AddNoteDto,
  AssignLabelDto,
  CreateLabelDto,
  ListConversationsQuery,
  SendMessageDto,
  SetStateDto,
  TransferDto,
} from './dto/inbox.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// Inbox acessível a todos os perfis autenticados (inclui atendentes).
@Controller('inbox')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get('conversations')
  list(@CurrentUser() user: AuthUser, @Query() query: ListConversationsQuery) {
    return this.inbox.listConversations(user.tenantId, query);
  }

  @Get('conversations/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.getConversation(user.tenantId, id);
  }

  @Post('conversations/:id/assign')
  assign(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inbox.assign(user.tenantId, id, user.sub);
  }

  @Post('conversations/:id/transfer')
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferDto,
  ) {
    return this.inbox.transfer(user.tenantId, id, dto.toUserId, user.sub);
  }

  @Post('conversations/:id/state')
  setState(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStateDto,
  ) {
    return this.inbox.setState(user.tenantId, id, dto.state, user.sub);
  }

  @Post('conversations/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.inbox.sendMessage(user.tenantId, id, dto.text, user.sub);
  }

  @Post('conversations/:id/notes')
  addNote(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.inbox.addNote(user.tenantId, id, user.sub, dto.body);
  }

  // ---- Etiquetas ----

  @Get('labels')
  listLabels(@CurrentUser() user: AuthUser) {
    return this.inbox.listLabels(user.tenantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('labels')
  createLabel(@CurrentUser() user: AuthUser, @Body() dto: CreateLabelDto) {
    return this.inbox.createLabel(user.tenantId, dto.name, dto.color);
  }

  @Post('conversations/:id/labels')
  addLabel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignLabelDto,
  ) {
    return this.inbox.addLabel(user.tenantId, id, dto.labelId);
  }

  @HttpCode(204)
  @Delete('conversations/:id/labels/:labelId')
  removeLabel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ) {
    return this.inbox.removeLabel(user.tenantId, id, labelId);
  }
}

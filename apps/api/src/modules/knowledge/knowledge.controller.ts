import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@vibesphere/shared';
import { KnowledgeService, UploadedFile as RawFile } from './knowledge.service';
import { CreateKnowledgeBaseDto, IngestUrlDto } from './dto/knowledge.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('knowledge-bases')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get()
  listBases(@CurrentUser() user: AuthUser) {
    return this.knowledge.listBases(user.tenantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  createBase(@CurrentUser() user: AuthUser, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledge.createBase(user.tenantId, dto.name);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(204)
  @Delete(':id')
  removeBase(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.removeBase(user.tenantId, id);
  }

  // ---- Documentos ----

  @Get(':id/documents')
  listDocuments(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.knowledge.listDocuments(user.tenantId, id);
  }

  // Upload multipart (campo "file"). Limite de 25MB.
  @Roles(Role.OWNER, Role.MANAGER)
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: RawFile,
  ) {
    return this.knowledge.uploadDocument(user.tenantId, id, file);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post(':id/documents/url')
  ingestUrl(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: IngestUrlDto,
  ) {
    return this.knowledge.ingestUrl(user.tenantId, id, dto);
  }

  // Reprocessamento de documento — Requisito 6.5
  @Roles(Role.OWNER, Role.MANAGER)
  @Post('documents/:documentId/reprocess')
  reprocess(
    @CurrentUser() user: AuthUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.knowledge.reprocess(user.tenantId, documentId);
  }
}

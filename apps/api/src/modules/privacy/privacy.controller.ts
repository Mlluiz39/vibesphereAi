import { Controller, Delete, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { PrivacyService } from './privacy.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// Operações sensíveis de dados pessoais — restritas a Owner/Manager.
@Roles(Role.OWNER, Role.MANAGER)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Post('contacts/:id/anonymize')
  anonymize(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.privacy.anonymizeContact(user.tenantId, id, user.sub);
  }

  @Delete('contacts/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.privacy.deleteContact(user.tenantId, id, user.sub);
  }
}

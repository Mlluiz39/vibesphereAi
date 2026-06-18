import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { TenantService } from './tenant.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenant: TenantService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.tenant.getCurrent(user.tenantId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('branding')
  updateBranding(@CurrentUser() user: AuthUser, @Body() branding: Record<string, unknown>) {
    return this.tenant.updateBranding(user.tenantId, branding);
  }
}

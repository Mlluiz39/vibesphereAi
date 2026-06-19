import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { MarketplaceService } from './marketplace.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get('templates')
  list(@Query('category') category?: string) {
    return this.marketplace.listTemplates(category);
  }

  // Instalação altera recursos do tenant — restrita a Owner/Manager.
  @Roles(Role.OWNER, Role.MANAGER)
  @Post('templates/:id/install')
  install(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.marketplace.install(user.tenantId, id, user.sub);
  }
}

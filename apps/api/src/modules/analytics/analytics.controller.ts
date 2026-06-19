import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@vibesphere/shared';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Roles(Role.OWNER, Role.MANAGER)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // KPIs por período. Default: últimos 30 dias.
  @Get('kpis')
  kpis(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 3600 * 1000);
    return this.analytics.getKpis(user.tenantId, { from: fromDate, to: toDate });
  }
}

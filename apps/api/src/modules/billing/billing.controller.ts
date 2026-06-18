import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@vibesphere/shared';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/billing.dto';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('billing/subscription')
  summary(@CurrentUser() user: AuthUser) {
    return this.billing.getSummary(user.tenantId);
  }

  @Roles(Role.OWNER)
  @Post('billing/checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() dto: CreateCheckoutDto) {
    return this.billing.createCheckout(user.tenantId, dto.planCode);
  }

  // Webhook público de pagamento (Stripe). Usa rawBody para validar assinatura.
  @Public()
  @HttpCode(200)
  @Post('webhooks/stripe')
  webhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['stripe-signature'] as string | undefined;
    const rawBody = req.rawBody ?? Buffer.from('');
    return this.billing.handleWebhook(rawBody, signature);
  }
}

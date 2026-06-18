import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { UserModule } from './modules/user/user.module';
import { AgentModule } from './modules/agent/agent.module';
import { BillingModule } from './modules/billing/billing.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { QueueModule } from './queue/queue.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { TenantContextInterceptor } from './common/tenant-context.interceptor';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Rate limiting global — Requisito 11.2
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    QueueModule,
    AuthModule,
    TenantModule,
    UserModule,
    BillingModule,
    AgentModule,
    KnowledgeModule,
    WhatsAppModule,
    InboxModule,
  ],
  providers: [
    // Ordem importa: autentica -> seta tenant context -> valida role
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

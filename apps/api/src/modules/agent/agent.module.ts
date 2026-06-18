import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [BillingModule],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}

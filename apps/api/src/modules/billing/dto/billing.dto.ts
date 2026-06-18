import { IsEnum } from 'class-validator';
import { PlanCode } from '@vibesphere/shared';

export class CreateCheckoutDto {
  @IsEnum(PlanCode)
  planCode!: PlanCode;
}

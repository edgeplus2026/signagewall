import { ApiProperty } from '@nestjs/swagger';

export class PlanEntitlementSchema {
  @ApiProperty({ enum: ['free', 'enterprise'] })
  plan: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'null means unlimited',
  })
  screenLimit: number | null;

  @ApiProperty()
  screensUsed: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'null means unlimited',
  })
  organizationLimit: number | null;

  @ApiProperty()
  organizationsUsed: number;

  @ApiProperty()
  canCreateScreen: boolean;

  @ApiProperty()
  canCreateOrganization: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  trialEndsAt: string | null;

  @ApiProperty({ type: Number, nullable: true })
  trialDaysLeft: number | null;

  @ApiProperty({
    description:
      'Covered by another account’s enterprise organization — hide plan prompts',
  })
  isSponsored: boolean;

  @ApiProperty()
  hasOpenUpgradeRequest: boolean;
}

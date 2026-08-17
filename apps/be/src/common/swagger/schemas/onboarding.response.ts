import { ApiProperty } from '@nestjs/swagger';

import { ONBOARDING_STEP_KEYS } from '../../../modules/onboarding/onboarding.constants';

export class OnboardingStepSchema {
  @ApiProperty({ enum: ONBOARDING_STEP_KEYS })
  key: string;

  @ApiProperty({ description: 'Derived from the organization’s content' })
  done: boolean;
}

export class OnboardingStateSchema {
  @ApiProperty({ type: OnboardingStepSchema, isArray: true })
  steps: OnboardingStepSchema[];

  @ApiProperty()
  completedCount: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty({ description: '0–100, rounded' })
  percent: number;

  @ApiProperty({
    enum: ONBOARDING_STEP_KEYS,
    nullable: true,
    description: 'First unfinished step; null once everything is done',
  })
  currentStep: string | null;

  @ApiProperty({ enum: ['active', 'completed', 'dismissed'] })
  status: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: string | null;

  @ApiProperty({
    description: 'Finished, but the user has not been shown that yet',
  })
  showCelebration: boolean;
}

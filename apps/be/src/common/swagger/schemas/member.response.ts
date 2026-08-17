import { ApiProperty } from '@nestjs/swagger';

export class MemberResponseSchema {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role: 'admin' | 'member' | 'viewer';

  @ApiProperty({ enum: ['approved', 'pending'] })
  status: 'approved' | 'pending';

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}

export class InvitationPreviewSchema {
  @ApiProperty()
  email: string;

  @ApiProperty()
  organizationName: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role: 'admin' | 'member' | 'viewer';

  @ApiProperty()
  accountExists: boolean;
}

export class AcceptInvitationResponseSchema {
  @ApiProperty()
  organizationId: string;
}

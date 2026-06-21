import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateAppDto } from './create-app.dto';

/** Slug is immutable; everything else is patchable by a super-admin. */
export class UpdateAppDto extends PartialType(
  OmitType(CreateAppDto, ['slug'] as const),
) {}

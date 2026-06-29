import { PartialType } from '@nestjs/swagger';

import { CreateAppCategoryDto } from './create-app-category.dto';

/** Everything on a category is patchable by a super-admin. */
export class UpdateAppCategoryDto extends PartialType(CreateAppCategoryDto) {}

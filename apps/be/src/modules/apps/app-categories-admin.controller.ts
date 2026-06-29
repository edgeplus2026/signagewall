import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
} from '../../common/swagger';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { AppCategoriesService } from './app-categories.service';
import { CreateAppCategoryDto } from './dto/create-app-category.dto';
import { UpdateAppCategoryDto } from './dto/update-app-category.dto';

/** Super-admin app-category management. */
@ApiTags('admin-app-categories')
@ApiBearerAuthRequired()
@ApiCommonErrorResponses()
@Controller('admin/app-categories')
@UseGuards(SuperAdminGuard)
export class AppCategoriesAdminController {
  constructor(private readonly categoriesService: AppCategoriesService) {}

  @Get()
  @ApiSuccessResponse(Object, { isArray: true })
  list() {
    return this.categoriesService.list();
  }

  @Post()
  @ApiSuccessResponse(Object)
  create(@Body() dto: CreateAppCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiSuccessResponse(Object)
  update(@Param('id') id: string, @Body() dto: UpdateAppCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiSuccessNullResponse()
  async remove(@Param('id') id: string): Promise<null> {
    await this.categoriesService.remove(id);
    return null;
  }
}

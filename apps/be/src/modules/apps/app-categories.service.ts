import { Injectable } from '@nestjs/common';

import { BusinessException } from '../../common/exceptions/business.exception';
import { AppCategoriesRepository } from './app-categories.repository';
import { AppsRepository } from './apps.repository';
import { CreateAppCategoryDto } from './dto/create-app-category.dto';
import { UpdateAppCategoryDto } from './dto/update-app-category.dto';
import {
  AppCategoryResponseDto,
  toAppCategoryResponse,
} from './mappers/app-category.mapper';
import { AppCategoryDocument } from './schemas/app-category.schema';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class AppCategoriesService {
  constructor(
    private readonly categoriesRepository: AppCategoriesRepository,
    private readonly appsRepository: AppsRepository,
  ) {}

  async list(): Promise<AppCategoryResponseDto[]> {
    const categories = await this.categoriesRepository.findAll();
    return categories.map(toAppCategoryResponse);
  }

  async create(dto: CreateAppCategoryDto): Promise<AppCategoryResponseDto> {
    const slug = await this.uniqueSlug(dto.name);
    const created = await this.categoriesRepository.create({
      name: dto.name,
      slug,
      order: dto.order ?? 0,
    });
    return toAppCategoryResponse(created);
  }

  async update(
    id: string,
    dto: UpdateAppCategoryDto,
  ): Promise<AppCategoryResponseDto> {
    await this.requireCategory(id);
    const data: { name?: string; order?: number; slug?: string } = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
      data.slug = await this.uniqueSlug(dto.name, id);
    }
    if (dto.order !== undefined) data.order = dto.order;

    const updated = await this.categoriesRepository.updateById(id, data);
    if (!updated) {
      throw BusinessException.notFound('Category not found');
    }
    return toAppCategoryResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.categoriesRepository.deleteById(id);
    if (!deleted) {
      throw BusinessException.notFound('Category not found');
    }
    // Drop the now-dangling reference from every app that used this category.
    await this.appsRepository.pullCategoryFromAll(id);
  }

  private async requireCategory(id: string): Promise<AppCategoryDocument> {
    const category = await this.categoriesRepository.findById(id);
    if (!category) {
      throw BusinessException.notFound('Category not found');
    }
    return category;
  }

  /** Derives a slug from the name, appending a suffix if it collides. */
  private async uniqueSlug(name: string, ignoreId?: string): Promise<string> {
    const base = toSlug(name);
    if (base.length === 0) {
      throw BusinessException.badRequest('Category name is invalid');
    }
    let candidate = base;
    let suffix = 2;
    for (;;) {
      const existing = await this.categoriesRepository.findBySlug(candidate);
      if (!existing || existing._id.toString() === ignoreId) {
        return candidate;
      }
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }
}

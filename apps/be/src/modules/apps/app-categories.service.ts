import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

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

/**
 * The base catalog taxonomy seeded on boot (enabler E0). The order sets the
 * default catalog layout; the super-admin owns it afterwards (rename, reorder,
 * add, delete). Slugs are derived from the names, so they line up with anything
 * a super-admin later creates by hand with the same name.
 */
const BASE_CATEGORIES: ReadonlyArray<{ name: string; order: number }> = [
  { name: 'Information', order: 1 },
  { name: 'Finance', order: 2 },
  { name: 'Productivity', order: 3 },
  { name: 'Data & Dashboards', order: 4 },
  { name: 'Media', order: 5 },
  { name: 'Social', order: 6 },
  { name: 'Utilities', order: 7 },
];

/** A MongoDB duplicate-key error (unique index violation). */
function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

@Injectable()
export class AppCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(AppCategoriesService.name);

  constructor(
    private readonly categoriesRepository: AppCategoriesRepository,
    private readonly appsRepository: AppsRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedBaseCategories();
  }

  /**
   * Ensure the base catalog taxonomy exists on boot (enabler E0). Idempotent and
   * ADDITIVE: a base category is created only when no category with its slug
   * exists, and an existing one is never renamed or reordered — so a new
   * environment gets a sensible starting set without a manual POST per category,
   * while a super-admin's customizations are left untouched. Assigning apps to
   * categories is a separate curation step (`PATCH /admin/apps/:id`) — categories
   * are catalog presentation, not part of any app's code manifest.
   */
  async seedBaseCategories(): Promise<void> {
    for (const base of BASE_CATEGORIES) {
      const slug = toSlug(base.name);
      if (await this.categoriesRepository.findBySlug(slug)) {
        continue;
      }
      try {
        await this.categoriesRepository.create({
          name: base.name,
          slug,
          order: base.order,
        });
        this.logger.log(`Seeded base app category "${base.name}"`);
      } catch (error) {
        // A concurrent boot may have inserted it between the check and the
        // create; the unique slug index turns that into a duplicate-key error,
        // which is exactly the state we wanted, so ignore it. Anything else is a
        // real failure and bubbles.
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
      }
    }
  }

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

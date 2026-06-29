import { AppCategoryDocument } from '../schemas/app-category.schema';

export interface AppCategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export const toAppCategoryResponse = (
  category: AppCategoryDocument,
): AppCategoryResponseDto => ({
  id: category._id.toString(),
  name: category.name,
  slug: category.slug,
  order: category.order,
});

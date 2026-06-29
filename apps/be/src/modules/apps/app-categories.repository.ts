import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  AppCategory,
  AppCategoryDocument,
} from './schemas/app-category.schema';

export type CreateAppCategoryData = {
  name: string;
  slug: string;
  order: number;
};

export type UpdateAppCategoryData = Partial<
  Pick<AppCategory, 'name' | 'slug' | 'order'>
>;

@Injectable()
export class AppCategoriesRepository {
  constructor(
    @InjectModel(AppCategory.name)
    private readonly model: Model<AppCategoryDocument>,
  ) {}

  async findAll(): Promise<AppCategoryDocument[]> {
    return this.model.find().sort({ order: 1, name: 1 }).exec();
  }

  async findById(id: string): Promise<AppCategoryDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(new Types.ObjectId(id)).exec();
  }

  async findBySlug(slug: string): Promise<AppCategoryDocument | null> {
    return this.model.findOne({ slug }).exec();
  }

  async create(data: CreateAppCategoryData): Promise<AppCategoryDocument> {
    const [category] = await this.model.create([data]);
    return category;
  }

  async updateById(
    id: string,
    data: UpdateAppCategoryData,
  ): Promise<AppCategoryDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.model
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }
}

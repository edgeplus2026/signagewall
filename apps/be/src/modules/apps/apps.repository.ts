import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { App, AppDocument } from './schemas/app.schema';

export type CreateAppData = Partial<Omit<App, 'categoryIds'>> & {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Category ids as strings; Mongoose casts them to ObjectIds on write. */
  categoryIds?: string[];
};

export type UpdateAppData = Partial<
  Omit<App, 'slug' | 'createdAt' | 'updatedAt' | 'configSchema' | 'categoryIds'>
> & {
  /** Stored as Mixed JSON; validated structurally elsewhere. */
  configSchema?: unknown[];
  /** Category ids as strings; Mongoose casts them to ObjectIds on write. */
  categoryIds?: string[];
};

@Injectable()
export class AppsRepository {
  constructor(
    @InjectModel(App.name)
    private readonly appModel: Model<AppDocument>,
  ) {}

  /** Full catalog (super-admin). */
  async findAll(): Promise<AppDocument[]> {
    return this.appModel.find().sort({ updatedAt: -1 }).exec();
  }

  /** Apps offered to organizations: public ones. */
  async findVisible(): Promise<AppDocument[]> {
    return this.appModel
      .find({ isPublic: true })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<AppDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.appModel.findById(new Types.ObjectId(id)).exec();
  }

  async findBySlug(slug: string): Promise<AppDocument | null> {
    return this.appModel.findOne({ slug }).exec();
  }

  async create(data: CreateAppData): Promise<AppDocument> {
    const [app] = await this.appModel.create([data]);
    return app;
  }

  async updateById(
    id: string,
    data: UpdateAppData,
  ): Promise<AppDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.appModel
      .findByIdAndUpdate(new Types.ObjectId(id), { $set: data }, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.appModel
      .deleteOne({ _id: new Types.ObjectId(id) })
      .exec();
    return result.deletedCount > 0;
  }

  /** All catalog slugs (to tell which code apps are already added). */
  async findAllSlugs(): Promise<string[]> {
    const docs = await this.appModel.find().select({ slug: 1 }).exec();
    return docs.map((doc) => doc.slug);
  }

  /** Removes a category reference from every app that has it (on category delete). */
  async pullCategoryFromAll(categoryId: string): Promise<void> {
    if (!Types.ObjectId.isValid(categoryId)) return;
    await this.appModel
      .updateMany(
        { categoryIds: new Types.ObjectId(categoryId) },
        { $pull: { categoryIds: new Types.ObjectId(categoryId) } },
      )
      .exec();
  }
}

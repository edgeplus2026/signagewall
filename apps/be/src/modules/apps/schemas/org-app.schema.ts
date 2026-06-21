import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** Records that an organization has installed a catalog app. */
@Schema({ timestamps: true, collection: 'orgapps' })
export class OrgApp {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'App', required: true })
  appId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  installedBy?: Types.ObjectId;

  createdAt!: Date;
  updatedAt!: Date;
}

export type OrgAppDocument = HydratedDocument<OrgApp>;

export const OrgAppSchema = SchemaFactory.createForClass(OrgApp);

// One install record per (org, app).
OrgAppSchema.index({ organizationId: 1, appId: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({
  timestamps: true,
  collection: 'organizations',
})
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  /**
   * Set when the org is queued for GDPR deletion. A soft-deleted org is hidden
   * from every member immediately; the 30-day sweep physically purges it. `null`
   * (the default) means the org is active.
   */
  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

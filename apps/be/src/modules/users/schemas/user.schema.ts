import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

export enum UserRole {
  USER = 'user',
  SUPER_ADMIN = 'super-admin',
}

export enum UserPlan {
  /** 21-day trial. One organization, one screen, then the account is erased. */
  FREE = 'free',
  /** Invoiced. `screenLimit` is the number of licences that were sold. */
  ENTERPRISE = 'enterprise',
}

/** Days a free account lives before the trial sweep erases it. */
export const TRIAL_DAYS = 21;

/** Screens a free account may create, across all of its organizations. */
export const FREE_SCREEN_LIMIT = 1;

const trialDeadline = (): Date =>
  new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  company?: string;

  @Prop({ select: false })
  password?: string;

  @Prop({ enum: AuthProvider, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Prop({ sparse: true, unique: true })
  googleId?: string;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  emailVerificationToken?: string;

  @Prop({ select: false })
  emailVerificationExpiresAt?: Date;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  @Prop({ select: false })
  refreshTokenHash?: string;

  /**
   * Billing tier. There is no payment integration — a plan only ever changes
   * because a super-admin changed it after an invoice was settled.
   */
  @Prop({ enum: UserPlan, default: UserPlan.FREE, index: true })
  plan: UserPlan;

  /**
   * Screens this account may own in total, summed across every organization it
   * created. For enterprise accounts it is the licence count that was sold.
   */
  @Prop({ default: FREE_SCREEN_LIMIT, min: 0 })
  screenLimit: number;

  /**
   * When the free trial runs out and the account is erased. Defaulted on
   * insert so every sign-up path (local, invite, Google) gets a clock without
   * having to remember to set one. Cleared to `null` on upgrade — an enterprise
   * account never expires.
   *
   * Accounts created before plans existed have no value at all; `$lte` never
   * matches a missing field, so the sweep leaves them alone until the migration
   * has given them an explicit plan.
   */
  @Prop({ type: Date, default: trialDeadline })
  trialEndsAt?: Date | null;

  /** Set when the "trial ends tomorrow" email went out, so it is sent once. */
  @Prop({ type: Date, default: null })
  trialWarningSentAt?: Date | null;

  @Prop({ enum: ['en', 'sr'], default: 'en' })
  language: string;

  @Prop({ enum: ['light', 'dark', 'system'], default: 'system' })
  theme: string;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

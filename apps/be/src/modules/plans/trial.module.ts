import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DataDeletionModule } from '../data-deletion/data-deletion.module';
import { MailModule } from '../mail/mail.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PlansModule } from './plans.module';
import { TrialService } from './trial.service';

/**
 * The free-trial clock: warn on day 20, erase on day 21.
 *
 * Separate from {@link PlansModule} because it needs the deletion cascade, and
 * DataDeletionModule already imports OrganizationsModule — which imports
 * PlansModule to gate organization creation. Keeping the sweep here means that
 * chain stays a line instead of a circle. Nothing imports this module.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PlansModule,
    DataDeletionModule,
    MailModule,
  ],
  providers: [TrialService],
  exports: [TrialService],
})
export class TrialModule {}

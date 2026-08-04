import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '../mail/mail.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { PlansModule } from './plans.module';
import { TrialService } from './trial.service';

/**
 * The free-trial clock: warn on day 20 and mark expired on day 21. Expiry is a
 * commercial state only; it never deletes data or stops the player.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PlansModule,
    MailModule,
  ],
  providers: [TrialService],
  exports: [TrialService],
})
export class TrialModule {}

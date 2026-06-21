import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [UsersModule, OrganizationsModule, MailModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}

import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import { MediaModule } from '../media/media.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { PlaylistsModule } from '../playlists/playlists.module';
import { ScreensModule } from '../screens/screens.module';
import { ScheduleEvaluator } from './schedule.evaluator';
import { SchedulesController } from './schedules.controller';
import { SchedulesRepository } from './schedules.repository';
import { SchedulesService } from './schedules.service';
import { Schedule, ScheduleSchema } from './schemas/schedule.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
    OrganizationsModule,
    forwardRef(() => ScreensModule),
    forwardRef(() => PlaylistsModule),
    forwardRef(() => MediaModule),
  ],
  controllers: [SchedulesController],
  providers: [
    SchedulesService,
    SchedulesRepository,
    ScheduleEvaluator,
    OrgMembershipGuard,
  ],
  exports: [SchedulesService, SchedulesRepository],
})
export class SchedulesModule {}

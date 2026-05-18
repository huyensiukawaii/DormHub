import { Module } from '@nestjs/common';
import { AnnouncementsController, StudentAnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { CloudinaryModule } from '@/common/cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CloudinaryModule, NotificationsModule],
  controllers: [AnnouncementsController, StudentAnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}

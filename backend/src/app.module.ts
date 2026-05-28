import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { StudentsModule } from './modules/students/students.module';
import { RegistrationPeriodsModule } from './modules/registration-periods/registration-periods.module';
import { StudentApplicationsModule } from './modules/student-applications/student-application.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { PriorityDocumentsModule } from './modules/priority-documents/priority-documents.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { MetersModule } from './modules/meters/meters.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RoomTransfersModule } from './modules/room-transfers/room-transfers.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ChatModule } from './modules/chat/chat.module';
import { RemindersModule } from './modules/reminders/reminders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CloudinaryModule,
    AuthModule,
    BuildingsModule,
    RoomsModule,
    StudentsModule,
    RegistrationPeriodsModule,
    StudentApplicationsModule,
    PriorityDocumentsModule,
    ContractsModule,
    MetersModule,
    SettingsModule,
    UsersModule,
    InvoicesModule,
    TicketsModule,
    NotificationsModule,
    RoomTransfersModule,
    AnnouncementsModule,
    ChatModule,
    RemindersModule,
  ],
})
export class AppModule {}
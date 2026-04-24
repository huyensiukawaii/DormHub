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
  ],
})
export class AppModule {}
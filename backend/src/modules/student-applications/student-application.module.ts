import { Module } from '@nestjs/common';
import { StudentApplicationsController, AdminApplicationsController } from './student-applications.controller';
import { StudentApplicationsService } from './student-application.service';
import { RegistrationPeriodsModule } from '../registration-periods/registration-periods.module';
 
@Module({
  imports: [RegistrationPeriodsModule],
  controllers: [StudentApplicationsController, AdminApplicationsController],
  providers: [StudentApplicationsService],
  exports: [StudentApplicationsService],
})
export class StudentApplicationsModule {}
 
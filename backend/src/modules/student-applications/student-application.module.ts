import { Module } from '@nestjs/common';
import { StudentApplicationsController, AdminApplicationsController, AdminDashboardController } from './student-applications.controller';
import { StudentApplicationsService } from './student-application.service';
import { RegistrationPeriodsModule } from '../registration-periods/registration-periods.module';
import { ContractsModule } from '../contracts/contracts.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [RegistrationPeriodsModule, ContractsModule, MailerModule],
  controllers: [StudentApplicationsController, AdminApplicationsController, AdminDashboardController],
  providers: [StudentApplicationsService],
  exports: [StudentApplicationsService],
})
export class StudentApplicationsModule {}
 
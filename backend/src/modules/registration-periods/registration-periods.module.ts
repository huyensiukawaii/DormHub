import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RegistrationPeriodsController } from './registration-periods.controller';
import { RegistrationPeriodsService } from './registration-periods.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RegistrationPeriodsController],
  providers: [RegistrationPeriodsService],
  exports: [RegistrationPeriodsService],
})
export class RegistrationPeriodsModule {}
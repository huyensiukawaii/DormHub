import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [MailerModule],
  providers: [RemindersService],
})
export class RemindersModule {}

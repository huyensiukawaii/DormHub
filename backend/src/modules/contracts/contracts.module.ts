import { Module } from '@nestjs/common';
import { AdminContractsController, StudentContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InvoicesModule, NotificationsModule],
  controllers: [AdminContractsController, StudentContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
import { Module } from '@nestjs/common';
import { AdminContractsController, StudentContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [],
  controllers: [AdminContractsController, StudentContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
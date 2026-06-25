import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PriorityDocumentsService } from './priority-documents.service';
import {
  StudentPriorityDocsController,
  AdminPriorityDocsController,
} from './priority-documents.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    SettingsModule,
  ],
  controllers: [StudentPriorityDocsController, AdminPriorityDocsController],
  providers: [PriorityDocumentsService],
  exports: [PriorityDocumentsService],
})
export class PriorityDocumentsModule {}

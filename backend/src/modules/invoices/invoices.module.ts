import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { SettingsModule } from '../settings/settings.module';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';

@Module({
  imports: [SettingsModule, CloudinaryModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

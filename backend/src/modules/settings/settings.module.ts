import { Module, OnModuleInit } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule implements OnModuleInit {
  constructor(private readonly settingsService: SettingsService) {}

  async onModuleInit() {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.settingsService.seedDefaults();
        return;
      } catch (err: any) {
        const isConnectionError =
          err?.code === 'P1017' ||
          err?.code === 'P1001' ||
          err?.message?.includes('timeout') ||
          err?.message?.includes('Connection terminated');
        if (attempt === 3 || !isConnectionError) {
          console.error('[SettingsModule] seedDefaults failed:', err?.message ?? err);
          return;
        }
        await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
  }
}
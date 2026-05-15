import { Module } from '@nestjs/common';
import { RoomTransfersController } from './room-transfers.controller';
import { RoomTransfersService } from './room-transfers.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RoomTransfersController],
  providers: [RoomTransfersService],
})
export class RoomTransfersModule {}

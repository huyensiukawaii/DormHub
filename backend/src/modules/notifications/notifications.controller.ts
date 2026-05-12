import {
  Controller, Get, Patch, Delete, Param, Query,
  ParseIntPipe, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo của tôi' })
  async findAll(@Query() query: QueryNotificationDto, @Request() req: any) {
    return this.service.findAll(req.user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Số thông báo chưa đọc' })
  async getUnreadCount(@Request() req: any) {
    return this.service.getUnreadCount(req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  async markAllRead(@Request() req: any) {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo đã đọc' })
  async markRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.markRead(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thông báo' })
  async deleteOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.deleteOne(id, req.user.id);
  }
}

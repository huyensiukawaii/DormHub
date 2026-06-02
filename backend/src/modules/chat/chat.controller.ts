import { Controller, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './chat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Gửi tin nhắn đến chatbot hỗ trợ sinh viên' })
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    const studentId: number = req.user.studentId;
    try {
      const reply = await this.chatService.chat(dto.messages, studentId);
      return { reply };
    } catch (err: any) {
      console.error('[Chat] Gemini error:', err?.message ?? err);
      const status = err?.status ?? err?.response?.status;
      if (status === 429) {
        throw new HttpException(
          { reply: 'Hệ thống đang bận, vui lòng thử lại sau ít giây.' },
          HttpStatus.OK,
        );
      }
      throw new HttpException(
        { reply: 'Có lỗi xảy ra, vui lòng thử lại.' },
        HttpStatus.OK,
      );
    }
  }
}

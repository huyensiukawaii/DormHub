import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto, RoomQueryDto } from './dto/room.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { getAllowedBuildingIds, assertBuildingAccess } from '@/common/utils/building-access';

@ApiTags('Rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phòng' })
  async findAll(@Query() query: RoomQueryDto, @Request() req: any) {
    return this.roomsService.findAll(query, getAllowedBuildingIds(req.user));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết phòng' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const room = await this.roomsService.findOne(id);
    assertBuildingAccess(req.user, room.buildingId);
    return room;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo phòng mới' })
  async create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật phòng' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa phòng' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
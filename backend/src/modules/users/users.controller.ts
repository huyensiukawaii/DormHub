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
import { UsersService } from './users.service';
import { AssignBuildingsDto, QueryUsersDto } from './dto/user.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách người dùng' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết người dùng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Put(':id/buildings')
  @ApiOperation({ summary: 'Cập nhật danh sách tòa được giao' })
  setBuildings(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: AssignBuildingsDto,
    @Request() req: any,
  ) {
    return this.usersService.setBuildings(userId, dto, req.user.id);
  }

  @Post(':id/buildings/:buildingId')
  @ApiOperation({ summary: 'Giao thêm tòa cho nhân viên' })
  addBuilding(
    @Param('id', ParseIntPipe) userId: number,
    @Param('buildingId', ParseIntPipe) buildingId: number,
    @Request() req: any,
  ) {
    return this.usersService.addBuilding(userId, buildingId, req.user.id);
  }

  @Delete(':id/buildings/:buildingId')
  @ApiOperation({ summary: 'Xóa phân công tòa của nhân viên' })
  removeBuilding(
    @Param('id', ParseIntPipe) userId: number,
    @Param('buildingId', ParseIntPipe) buildingId: number,
  ) {
    return this.usersService.removeBuilding(userId, buildingId);
  }
}

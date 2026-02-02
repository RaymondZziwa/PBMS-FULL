import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { StoreService } from './stores.service';
import { JwtAuthGuard } from 'src/guards/authGuard.guard';
import type { Request } from 'express';

@Controller('api/store')
export class StoresController {
  constructor(private readonly storeService: StoreService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(
    @Body()
    data: {
      branchId: number;
      deptId: number;
      name: string;
      authorizedPersonnel: number[];
    },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!user || !user.role || user.role.name?.toLowerCase() !== 'administrator') {
      throw new ForbiddenException('Only administrators can create stores');
    }
    return this.storeService.create({
      ...data,
      branchId: Number(data.branchId),
      deptId: Number(data.deptId),
      authorizedPersonnel: data.authorizedPersonnel.map(id => Number(id)),
    });
  }

  @Get('fetch-all')
  findAll() {
    return this.storeService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(Number(id));
  }

  @Patch('modify/:id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body()
    data: {
      branchId: number;
      deptId: number;
      name: string;
      authorizedPersonnel: number[];
    },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    if (!user || !user.role || user.role.name?.toLowerCase() !== 'administrator') {
      throw new ForbiddenException('Only administrators can modify stores');
    }
    return this.storeService.update(Number(id), {
      ...data,
      branchId: data.branchId ? Number(data.branchId) : undefined,
      deptId: data.deptId ? Number(data.deptId) : undefined,
      authorizedPersonnel: data.authorizedPersonnel.map(id => Number(id)),
    });
  }

  @Delete('delete/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    if (!user || !user.role || user.role.name?.toLowerCase() !== 'administrator') {
      throw new ForbiddenException('Only administrators can delete stores');
    }
    return this.storeService.remove(Number(id));
  }
}

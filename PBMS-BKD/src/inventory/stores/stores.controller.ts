import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { StoreService } from './stores.service';

@Controller('api/store')
export class StoresController {
  constructor(private readonly storeService: StoreService) {}

  @Post('create')
  create(
    @Body()
    data: {
      branchId: number;
      deptId: number;
      name: string;
      authorizedPersonnel: number[];
    },
  ) {
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
  update(
    @Param('id') id: string,
    @Body()
    data: {
      branchId: number;
      deptId: number;
      name: string;
      authorizedPersonnel: number[];
    },
  ) {
    return this.storeService.update(Number(id), {
      ...data,
      branchId: data.branchId ? Number(data.branchId) : undefined,
      deptId: data.deptId ? Number(data.deptId) : undefined,
      authorizedPersonnel: data.authorizedPersonnel.map(id => Number(id)),
    });
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.storeService.remove(Number(id));
  }
}

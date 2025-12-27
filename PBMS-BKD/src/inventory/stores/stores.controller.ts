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
      branchId: string;
      deptId: string;
      name: string;
      authorizedPersonnel: string[];
    },
  ) {
    return this.storeService.create(data);
  }

  @Get('fetch-all')
  findAll() {
    return this.storeService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.storeService.findOne(id);
  }

  @Patch('modify/:id')
  update(
    @Param('id') id: string,
    @Body()
    data: {
      branchId: string;
      deptId: string;
      name: string;
      authorizedPersonnel: string[];
    },
  ) {
    return this.storeService.update(id, data);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.storeService.remove(id);
  }
}

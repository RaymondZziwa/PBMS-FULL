import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { StoreService } from './stores.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

/** Creating, changing and deleting stores needs "Create and modify stores"; reading is wider. */
@Controller('api/store')
@RequirePermissions(PERMISSIONS.STORES)
export class StoresController {
  constructor(private readonly storeService: StoreService) {}

  @Post('create')
  create(@Body() body: Record<string, unknown>) {
    return this.storeService.create(body);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION, PERMISSIONS.STORES, PERMISSIONS.REPORTS)
  @Get('fetch-all')
  findAll() {
    return this.storeService.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION, PERMISSIONS.STORES)
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.storeService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.storeService.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.storeService.remove(id);
  }
}

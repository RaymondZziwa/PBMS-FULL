import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ItemService } from './items.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/item')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class ItemController {
  constructor(private readonly items: ItemService) {}

  @Post('create')
  create(@Body() body: Record<string, unknown>) {
    return this.items.create(body);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION, PERMISSIONS.REPORTS)
  @Get('fetch-all')
  findAll() {
    return this.items.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION, PERMISSIONS.REPORTS)
  @Get('fetch-store-inventory/:id')
  findAllStoreInventory(@Param('id', ParseIntPipe) id: number) {
    return this.items.findAllWithStoreQuantity(id);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.items.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.items.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.items.remove(id);
  }
}

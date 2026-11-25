import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ItemCategoryService } from './itemCateogries.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/item-categories')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class ItemCategoryController {
  constructor(private readonly categories: ItemCategoryService) {}

  @Post('create')
  create(@Body() body: Record<string, unknown>) {
    return this.categories.create(body);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch-all')
  findAll() {
    return this.categories.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categories.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.categories.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}

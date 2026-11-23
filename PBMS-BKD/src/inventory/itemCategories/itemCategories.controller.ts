import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ItemCategoryService } from './itemCateogries.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/item-categories')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class ItemCategoryController {
  constructor(private readonly itemCategoryService: ItemCategoryService) {}

  @Post('create')
  create(@Body() data: { name: string }) {
    return this.itemCategoryService.create(data);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch-all')
  findAll() {
    return this.itemCategoryService.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.itemCategoryService.findOne(Number(id));
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() data: { name?: string }) {
    return this.itemCategoryService.update(Number(id), data);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.itemCategoryService.remove(Number(id));
  }
}

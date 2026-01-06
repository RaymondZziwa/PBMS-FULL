import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ItemService } from './items.service';

@Controller('api/item')
export class ItemController {
  constructor(private readonly itemCategoryService: ItemService) {}

  @Post('create')
  create(
    @Body()
    data: {
      categoryId: number;
      name: string;
      price: number;
      showInPos: boolean;
    },
  ) {
    return this.itemCategoryService.create(data);
  }

  @Get('fetch-all')
  findAll() {
    return this.itemCategoryService.findAll();
  }

  @Get('fetch-store-inventory/:id')
  findAllStoreInventory(@Param('id') id: string) {
    return this.itemCategoryService.findAllWithStoreQuantity(Number(id));
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.itemCategoryService.findOne(Number(id));
  }

  @Patch('modify/:id')
  update(
    @Param('id') id: string,
    @Body() data: {  categoryId?: number; name?: string; price?: number },
  ) {
    return this.itemCategoryService.update(Number(id), data);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.itemCategoryService.remove(Number(id));
  }
}

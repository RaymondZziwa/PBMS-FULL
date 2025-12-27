import { Body, Controller, Post, Get, Param } from '@nestjs/common';
import { CreateExpoStockMovementDto } from 'src/dto/exhibition.dto';
import { ExhibitionStockMovementService } from './exhibitionInventory.service';

@Controller('api/expo-stock-movement')
export class ExhibitionStockMovementController {
  constructor(
    private readonly expoStockMovementService: ExhibitionStockMovementService,
  ) {}

  @Post('create')
  async create(@Body() dto: CreateExpoStockMovementDto) {
    return this.expoStockMovementService.create(dto);
  }

  @Get('fetch-all')
  async fetchAll() {
    return this.expoStockMovementService.getAllStockMovementRecords();
  }

  @Get('fetch-exhibitionstore-inventory/:id')
  findAllStoreInventory(@Param('id') id: string) {
    return this.expoStockMovementService.findAllWithStoreQuantity(id);
  }

  @Get('fetch-all-stores')
  async fetchAllStores() {
    return this.expoStockMovementService.getAllExhibitionStores();
  }
}

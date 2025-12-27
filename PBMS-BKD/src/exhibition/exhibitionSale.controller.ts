import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import { ExhibitionCreateSaleDto, UpdateSaleDto } from 'src/dto/pos.dto';
import { ExhibitionSalesService } from './exhibitionSale.service';

@Controller('api/exhibition-sales')
export class ExhibitionSalesController {
  constructor(private readonly salesService: ExhibitionSalesService) {}

  @Post('create')
  async create(@Body() createSaleDto: ExhibitionCreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get('fetch-all')
  async findAll() {
    return this.salesService.findAll();
  }

  @Get('fetch/:id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Put('modify/:id')
  async update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }
}

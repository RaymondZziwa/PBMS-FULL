import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
} from '@nestjs/common';
import {
  CollectCreditPaymentDto,
  CreateSaleDto,
  UpdateSaleDto,
} from 'src/dto/pos.dto';
import { SalesService } from './pos.service';

@Controller('api/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('create')
  async create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Post('credit-payment')
  async collectCreditPayment(@Body() dto: CollectCreditPaymentDto) {
    return this.salesService.collectCreditPayment(dto);
  }

  @Get('fetch-all')
  async findAll() {
    return this.salesService.findAll();
  }

  @Get('credit-sales/:id')
  async findAllCreditSales(@Param('id') id: string) {
    return this.salesService.findCreditSales(Number(id));
  }

  @Get('fetch/:id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(Number(id));
  }

  @Put('modify/:id')
  async update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(Number(id), updateSaleDto);
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    return this.salesService.remove(Number(id));
  }
}

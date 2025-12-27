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
import { MassageSalesService } from './massage.service';

@Controller('api/service-sales')
export class MassageSalesController {
  constructor(private readonly salesService: MassageSalesService) {}

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

  @Get('credit-sales')
  async findAllCreditSales() {
    return this.salesService.findMassageCreditSales();
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

// src/bank/bank.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { CreateBankDto, UpdateBankDto } from 'src/dto/bank.dto';

@Controller('api/banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post('save')
  create(@Body() dto: CreateBankDto) {
    return this.bankService.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.bankService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.bankService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateBankDto) {
    return this.bankService.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.bankService.remove(id);
  }
}

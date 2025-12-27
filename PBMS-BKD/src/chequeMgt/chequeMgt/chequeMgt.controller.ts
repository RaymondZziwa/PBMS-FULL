import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { CreateChequeDto, UpdateChequeDto } from 'src/dto/chequeMgt.dto';
import { ChequeService } from './chequeMgt.service';

@Controller('api/cheques')
export class ChequeController {
  constructor(private readonly chequeService: ChequeService) {}

  @Post('save')
  create(@Body() dto: CreateChequeDto) {
    return this.chequeService.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.chequeService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.chequeService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateChequeDto) {
    return this.chequeService.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.chequeService.remove(id);
  }
}

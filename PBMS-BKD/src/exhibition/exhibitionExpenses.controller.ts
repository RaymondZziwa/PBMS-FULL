import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import {
  CreateExhibitionExpenseDto,
  UpdateExhibitionExpenseDto,
} from 'src/dto/exhibition.dto';
import { ExhibitionExpensesService } from './exhibitionExpenses.service';

@Controller('api/exhibition-expenses')
export class ExhibitionExpensesController {
  constructor(
    private readonly exhibitionExpensesService: ExhibitionExpensesService,
  ) {}

  @Post('create')
  create(@Body() dto: CreateExhibitionExpenseDto) {
    return this.exhibitionExpensesService.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.exhibitionExpensesService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.exhibitionExpensesService.findOne(id);
  }

  @Put('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateExhibitionExpenseDto) {
    return this.exhibitionExpensesService.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.exhibitionExpensesService.remove(id);
  }
}

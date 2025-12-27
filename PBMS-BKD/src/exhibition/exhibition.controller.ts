import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ExhibitionService } from './exhibition.service';
import {
  CreateExhibitionDto,
  UpdateExhibitionDto,
} from 'src/dto/exhibition.dto';

@Controller('api/exhibitions')
export class ExhibitionController {
  constructor(private svc: ExhibitionService) {}

  @Post('create')
  create(@Body() dto: CreateExhibitionDto) {
    return this.svc.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.svc.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateExhibitionDto) {
    return this.svc.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateExhibitionStoreDto,
  UpdateExhibitionStoreDto,
} from 'src/dto/exhibition.dto';
import { ExhibitionStoreService } from './exhibitionStore.service';

@Controller('api/exhibition-stores')
export class ExhibitionStoreController {
  constructor(private svc: ExhibitionStoreService) {}

  @Post('save')
  create(@Body() dto: CreateExhibitionStoreDto) {
    return this.svc.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.svc.findAll();
  }

  @Get('by-exhibition/:exhibitionId')
  findByExhibition(@Param('exhibitionId') exhibitionId: string) {
    return this.svc.findByExhibition(exhibitionId);
  }

  @Get(':id') findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Put('modify/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateExhibitionStoreDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Delete('delete/:id') remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

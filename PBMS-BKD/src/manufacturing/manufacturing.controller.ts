import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';
import {
  CreateManufacturingDto,
  UpdateManufacturingDto,
  CompleteManufacturingDto,
} from 'src/dto/manufacturing.dto';

@Controller('api/manufacturing')
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Post('create')
  create(@Body() dto: CreateManufacturingDto) {
    return this.manufacturingService.create(dto);
  }

  @Get('fetch-all')
  findAll() {
    return this.manufacturingService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.manufacturingService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateManufacturingDto) {
    return this.manufacturingService.update(id, dto);
  }

  @Patch('complete/:id')
  complete(@Param('id') id: string, @Body() dto: CompleteManufacturingDto) {
    return this.manufacturingService.completeManufacturing(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.manufacturingService.remove(id);
  }
}

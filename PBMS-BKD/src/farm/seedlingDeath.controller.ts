import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  CreateSeedlingDeathDto,
  UpdateSeedlingDeathDto,
} from 'src/dto/farm.dto';
import { SeedlingDeathService } from './seedlingDeath.service';

@Controller('api/seedling-death')
export class SeedlingDeathController {
  constructor(private readonly service: SeedlingDeathService) {}

  @Post('save')
  create(@Body() dto: CreateSeedlingDeathDto) {
    return this.service.create(dto);
  }

  @Get('all')
  findAll() {
    return this.service.findAll();
  }

  @Get('find/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSeedlingDeathDto) {
    return this.service.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

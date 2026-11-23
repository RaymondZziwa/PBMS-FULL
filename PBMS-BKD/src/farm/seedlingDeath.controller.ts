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
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/seedling-death')
@RequirePermissions(PERMISSIONS.FARM)
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
    return this.service.findOne(Number(id));
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() dto: UpdateSeedlingDeathDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}

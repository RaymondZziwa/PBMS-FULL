import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MeasurementUnitService } from './units.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/units')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class MeasurementUnitController {
  constructor(private readonly measurementService: MeasurementUnitService) {}

  @Post('create')
  create(@Body() data: { name: string; abr: string }) {
    return this.measurementService.create(data);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch-all')
  findAll() {
    return this.measurementService.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.measurementService.findOne(Number(id));
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() data: { name?: string }) {
    return this.measurementService.update(Number(id), data);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.measurementService.remove(Number(id));
  }
}

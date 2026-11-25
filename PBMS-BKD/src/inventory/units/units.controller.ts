import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { MeasurementUnitService } from './units.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/units')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class MeasurementUnitController {
  constructor(private readonly units: MeasurementUnitService) {}

  @Post('create')
  create(@Body() body: Record<string, unknown>) {
    return this.units.create(body);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch-all')
  findAll() {
    return this.units.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.units.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.units.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.units.remove(id);
  }
}

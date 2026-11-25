import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { MservicesService } from './services.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/services')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class ServicesController {
  constructor(private readonly services: MservicesService) {}

  @Post('create')
  create(@Body() body: Record<string, unknown>) {
    return this.services.create(body);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch-all')
  findAll() {
    return this.services.findAll();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.SALES, PERMISSIONS.EXHIBITION)
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.services.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.services.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.services.remove(id);
  }
}

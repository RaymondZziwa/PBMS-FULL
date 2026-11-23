import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @RequirePermissions(PERMISSIONS.BRANCHES)
  @Post('create')
  create(@Body() data: { name?: unknown; location?: unknown }) {
    return this.branchService.create(data);
  }

  @Get('fetch-all')
  findAll() {
    return this.branchService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.BRANCHES)
  @Patch('modify/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { name?: unknown; location?: unknown },
  ) {
    return this.branchService.update(id, data);
  }

  @RequirePermissions(PERMISSIONS.BRANCHES)
  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.branchService.remove(id);
  }
}

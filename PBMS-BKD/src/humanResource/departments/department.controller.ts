import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from 'src/dto/humanResource.dto';
import { RequirePermissions, SignedIn } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/departments')
@RequirePermissions(PERMISSIONS.HR, PERMISSIONS.EMPLOYEES)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post('create')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentService.create(dto);
  }

  @SignedIn()
  @Get('fetch-all')
  findAll() {
    return this.departmentService.findAll();
  }

  @SignedIn()
  @Get('fetch/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.departmentService.update(id, dto);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.remove(id);
  }
}

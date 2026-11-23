import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { RoleService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from 'src/dto/roles.dto';
import { CurrentUser, RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';
import type { AuthenticatedUser } from 'src/auth/permissions';

@Controller('api/roles')
@RequirePermissions(PERMISSIONS.ROLES, PERMISSIONS.ASSIGN_PERMISSIONS)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post('create')
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @RequirePermissions(PERMISSIONS.ROLES, PERMISSIONS.ASSIGN_PERMISSIONS, PERMISSIONS.HR, PERMISSIONS.EMPLOYEES)
  @Get('fetch-all')
  findAll() {
    return this.roleService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.roleService.findOne(Number(id));
  // }

  @Patch('modify/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() me: AuthenticatedUser) {
    return this.roleService.update(id, updateRoleDto, me);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthenticatedUser) {
    return this.roleService.remove(id, me);
  }

  @Get('permissions')
  findAllPermissions() {
    return this.roleService.getAllPermissions();
  }
}

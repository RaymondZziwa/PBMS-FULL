import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post('create')
  create(@Body() data: { name: string; price: number }) {
    return this.projectsService.create(data);
  }

  @Get('fetch-all')
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('fetch/:id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch('modify/:id')
  update(@Param('id') id: string, @Body() data: { name?: string }) {
    return this.projectsService.update(id, data);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}

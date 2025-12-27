import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class ProjectsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    name: string;
    price: number;
  }): Promise<GenericResponse> {
    const project = await this.prismaService.project.create({ data });
    return {
      status: 200,
      data: project,
      message: 'Project created successfully',
    };
  }

  async findAll(): Promise<GenericResponse> {
    const itemCategories = await this.prismaService.project.findMany();
    return {
      status: 200,
      data: itemCategories,
      message: 'Item categories fetched successfully',
    };
  }

  async findOne(id: string): Promise<GenericResponse> {
    const project = await this.prismaService.project.findUnique({
      where: { id },
    });
    return {
      status: 200,
      data: project,
      message: 'Project fetched successfully',
    };
  }

  async update(id: string, data: { name?: string }): Promise<GenericResponse> {
    const project = await this.prismaService.project.update({
      where: { id },
      data,
    });
    return {
      status: 200,
      data: project,
      message: 'Project modified successfully',
    };
  }

  async remove(id: string): Promise<GenericResponse> {
    const project = await this.prismaService.project.delete({
      where: { id },
    });
    return {
      status: 200,
      data: project,
      message: 'Project deleted successfully',
    };
  }
}

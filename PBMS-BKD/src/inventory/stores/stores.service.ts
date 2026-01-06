import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class StoreService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    branchId: number;
    deptId: number;
    name: string;
    authorizedPersonnel: string[];
  }): Promise<GenericResponse> {
    const store = await this.prismaService.store.create({ data });
    return {
      status: 200,
      data: store,
      message: 'Store created successfully',
    };
  }

  async findAll(): Promise<GenericResponse> {
    const stores = await this.prismaService.store.findMany({
      include: {
        branch: true,
        dept: true,
      },
    });
    return {
      status: 200,
      data: stores,
      message: 'Stores fetched successfully',
    };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.findUnique({
      where: { id },
    });
    return {
      status: 200,
      data: store,
      message: 'Store fetched successfully',
    };
  }

  async update(
    id: number,
    data: {  branchId?: number;  deptId?: number;
      name?: string;
      authorizedPersonnel: string[];
    },
  ): Promise<GenericResponse> {
    const store = await this.prismaService.store.update({
      where: { id },
      data,
    });
    return {
      status: 200,
      data: store,
      message: 'Store modified successfully',
    };
  }

  async remove(id: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.delete({
      where: { id },
    });
    return {
      status: 200,
      data: store,
      message: 'Store deleted successfully',
    };
  }
}

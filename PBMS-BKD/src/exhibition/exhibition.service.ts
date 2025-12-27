import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateExhibitionDto,
  UpdateExhibitionDto,
} from 'src/dto/exhibition.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class ExhibitionService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateExhibitionDto): Promise<GenericResponse> {
    const data = {
      name: dto.name,
      location: dto.location,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    };
    try {
      const expo = await this.prismaService.exhibition.create({ data });

      await this.prismaService.exhibitionStore.create({
        data: {
          name: `${expo.name} Store`,
          exhibitionId: expo.id,
        },
      });

      return {
        status: 201,
        data: [],
        message: 'Exhibition plus exhibition store created successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        status: 201,
        data: [],
        message: err.message,
      };
      //throw new InternalServerErrorException(err.message);
    }
  }

  async findAll(): Promise<GenericResponse> {
    const expos = await this.prismaService.exhibition.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      data: expos,
      message: 'Exhibitions fetched successfully',
    };
  }

  async findOne(id: string) {
    const e = await this.prismaService.exhibition.findUnique({ where: { id } });
    if (!e) throw new NotFoundException(`Exhibition ${id} not found`);
    return e;
  }

  async update(id: string, dto: UpdateExhibitionDto): Promise<GenericResponse> {
    await this.findOne(id);
    const data: {
      id: string;
      name: string;
      location: string;
      description: string | null;
      startDate: Date;
      endDate: Date;
    } = {
      id: '',
      name: '',
      location: '',
      description: null,
      startDate: new Date(),
      endDate: new Date(),
    };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    try {
      await this.prismaService.exhibition.update({ where: { id }, data });
      return {
        status: 200,
        data: [],
        message: 'Exhibition updated successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        status: 500,
        data: [],
        message: err.message,
      };
    }
  }

  async remove(id: string): Promise<GenericResponse> {
    await this.findOne(id);

    try {
      await this.prismaService.exhibition.delete({ where: { id } });
      return {
        status: 200,
        data: [],
        message: 'Exhibition deleted successfully',
      };
    } catch (error) {
      const err = error as Error;
      return {
        status: 500,
        data: [],
        message: err.message,
      };
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateExhibitionStoreDto,
  UpdateExhibitionStoreDto,
} from 'src/dto/exhibition.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExhibitionStoreService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExhibitionStoreDto) {
    // ensure exhibition exists
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: dto.exhibitionId },
    });
    if (!exhibition)
      throw new BadRequestException(`Exhibition ${dto.exhibitionId} not found`);
    return this.prisma.exhibitionStore.create({
      data: { name: dto.name, exhibitionId: dto.exhibitionId },
    });
  }

  async findAll() {
    return this.prisma.exhibitionStore.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByExhibition(exhibitionId: string) {
    return this.prisma.exhibitionStore.findMany({ where: { exhibitionId } });
  }

  async findOne(id: string) {
    const store = await this.prisma.exhibitionStore.findUnique({
      where: { id },
    });
    if (!store) throw new NotFoundException(`Store ${id} not found`);
    return store;
  }

  async update(id: string, dto: UpdateExhibitionStoreDto) {
    await this.findOne(id);
    return this.prisma.exhibitionStore.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.exhibitionStore.delete({ where: { id } });
  }
}

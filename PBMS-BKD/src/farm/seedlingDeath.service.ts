import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSeedlingDeathDto,
  UpdateSeedlingDeathDto,
} from 'src/dto/farm.dto';

@Injectable()
export class SeedlingDeathService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSeedlingDeathDto) {
    // 1. Get the batch
    const batch = await this.prisma.seedlingBatch.findUnique({
      where: { id: dto.batchId },
    });

    if (!batch) {
      throw new NotFoundException('Seedling batch not found');
    }

    // 2. Existing seedlings array in the batch
    const existingSeedlings = batch.seedlings as any[];

    // 3. Update seedlings based on submitted deaths
    const updatedSeedlings = existingSeedlings.map((seed) => {
      const submitted = dto.seedlings.find((s) => s.seedlingId === seed.id);

      if (!submitted) return seed; // no change for this seedling

      const newLostQty = seed.lostQty + submitted.deathCount;

      return {
        ...seed,
        seedlingName: seed.seedlingName,
        lostQty: newLostQty,
        currentQty: seed.plantedQty - newLostQty,
      };
    });

    // 4. Update the batch with modified seedlings
    await this.prisma.seedlingBatch.update({
      where: { id: dto.batchId },
      data: {
        seedlings: updatedSeedlings,
      },
    });

    // 5. Save the seedling death record
    return this.prisma.seedlingDeath.create({
      data: {
        batchId: dto.batchId,
        stageId: dto.stageId,
        seedlings: dto.seedlings, // actual submitted losses
        reason: dto.reason,
      },
    });
  }

  async findAll() {
    return this.prisma.seedlingDeath.findMany({
      include: {
        batch: true,
        stage: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.seedlingDeath.findUnique({
      where: { id },
      include: { batch: true, stage: true },
    });

    if (!record) throw new NotFoundException('SeedlingDeath not found');

    return record;
  }

  async update(id: string, dto: UpdateSeedlingDeathDto) {
    // ensure record exists
    await this.findOne(id);

    return this.prisma.seedlingDeath.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string) {
    // ensure record exists
    await this.findOne(id);

    return this.prisma.seedlingDeath.delete({
      where: { id },
    });
  }
}

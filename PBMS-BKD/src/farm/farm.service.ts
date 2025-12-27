import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import {
  CreateSeedlingStageDto,
  UpdateSeedlingStageDto,
  QuerySeedlingStageDto,
  CreateSeedlingBatchDto,
  UpdateSeedlingBatchDto,
  UpdateSeedlingBatchStatusDto,
  QuerySeedlingBatchDto,
} from 'src/dto/farm.dto';
import { SeedlingGrowthStatus } from '@prisma/client';

@Injectable()
export class FarmService {
  constructor(private readonly prismaService: PrismaService) {}

  // ==================== SeedlingStages CRUD ====================

  async createSeedlingStage(
    data: CreateSeedlingStageDto,
  ): Promise<GenericResponse> {
    const stage = await this.prismaService.seedlingStages.create({ data });
    return {
      status: 200,
      data: stage,
      message: 'Seedling stage created successfully',
    };
  }

  async findAllSeedlingStages(
    query?: QuerySeedlingStageDto,
  ): Promise<GenericResponse> {
    const {
      skip = 0,
      take = 10,
      name,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = query || {};

    const where: any = {};
    if (name) {
      where.name = { contains: name };
    }

    const stages = await this.prismaService.seedlingStages.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: { [orderBy]: orderDirection },
    });

    const total = await this.prismaService.seedlingStages.count({ where });

    return {
      status: 200,
      data: {
        items: stages,
        total,
        skip: Number(skip),
        take: Number(take),
      },
      message: 'Seedling stages fetched successfully',
    };
  }

  async findOneSeedlingStage(id: string): Promise<GenericResponse> {
    const stage = await this.prismaService.seedlingStages.findUnique({
      where: { id },
      include: {
        seedlingBatches: true,
      },
    });

    if (!stage) {
      return {
        status: 404,
        data: null,
        message: 'Seedling stage not found',
      };
    }

    return {
      status: 200,
      data: stage,
      message: 'Seedling stage fetched successfully',
    };
  }

  async updateSeedlingStage(
    id: string,
    data: UpdateSeedlingStageDto,
  ): Promise<GenericResponse> {
    const stage = await this.prismaService.seedlingStages.update({
      where: { id },
      data,
    });

    return {
      status: 200,
      data: stage,
      message: 'Seedling stage updated successfully',
    };
  }

  async removeSeedlingStage(id: string): Promise<GenericResponse> {
    await this.prismaService.seedlingStages.delete({
      where: { id },
    });

    return {
      status: 200,
      data: null,
      message: 'Seedling stage deleted successfully',
    };
  }

  // ==================== SeedlingBatch CRUD ====================

  async createSeedlingBatch(
    data: CreateSeedlingBatchDto,
  ): Promise<GenericResponse> {
    // Verify that the currentStageId exists
    const stage = await this.prismaService.seedlingStages.findUnique({
      where: { id: data.currentStageId },
    });

    if (!stage) {
      return {
        status: 404,
        data: null,
        message: 'Seedling stage not found',
      };
    }

    // Create the batch
    const batch = await this.prismaService.seedlingBatch.create({ data });

    // Calculate endDate by adding stageDays to createdAt
    const endDate = new Date(
      batch.createdAt.getTime() + stage.stageDays * 24 * 60 * 60 * 1000,
    );

    // Initialize batch tracker
    await this.prismaService.seedlingBatchTracker.create({
      data: {
        batchId: batch.id,
        currentStageId: batch.currentStageId,
        startDate: batch.createdAt,
        endDate,
        daysToNextStage: stage.stageDays,
      },
    });

    return {
      status: 200,
      data: batch,
      message: 'Seedling batch created successfully',
    };
  }

  async findAllSeedlingBatches(
    query?: QuerySeedlingBatchDto,
  ): Promise<GenericResponse> {
    const {
      skip = 0,
      take = 10,
      batchNumber,
      currentStageId,
      status,
      orderBy = 'createdAt',
      orderDirection = 'desc',
    } = query || {};

    const where: any = {};
    if (batchNumber) {
      where.batchNumber = { contains: batchNumber };
    }
    if (currentStageId) {
      where.currentStageId = currentStageId;
    }
    if (status) {
      where.status = status;
    }

    const batches = await this.prismaService.seedlingBatch.findMany({
      where,
      skip: Number(skip),
      take: Number(take),
      orderBy: { [orderBy]: orderDirection },
      include: {
        currentStage: true,
        seedlingBatchTrackers: true,
        seedlingDeaths: true,
      },
    });

    const total = await this.prismaService.seedlingBatch.count({ where });

    return {
      status: 200,
      data: {
        items: batches,
        total,
        skip: Number(skip),
        take: Number(take),
      },
      message: 'Seedling batches fetched successfully',
    };
  }

  async findOneSeedlingBatch(id: string): Promise<GenericResponse> {
    const batch = await this.prismaService.seedlingBatch.findUnique({
      where: { id },
      include: {
        currentStage: true,
        seedlingBatchTrackers: {
          include: {
            currentStage: true,
          },
        },
        seedlingDeaths: {
          include: {
            stage: true,
          },
        },
      },
    });

    if (!batch) {
      return {
        status: 404,
        data: null,
        message: 'Seedling batch not found',
      };
    }

    return {
      status: 200,
      data: batch,
      message: 'Seedling batch fetched successfully',
    };
  }

  async updateSeedlingBatch(
    id: string,
    data: UpdateSeedlingBatchDto,
  ): Promise<GenericResponse> {
    // If currentStageId is being updated, verify it exists
    if (data.currentStageId) {
      const stage = await this.prismaService.seedlingStages.findUnique({
        where: { id: data.currentStageId },
      });

      if (!stage) {
        return {
          status: 404,
          data: null,
          message: 'Seedling stage not found',
        };
      }
    }

    const batch = await this.prismaService.seedlingBatch.update({
      where: { id },
      data,
    });

    return {
      status: 200,
      data: batch,
      message: 'Seedling batch updated successfully',
    };
  }

  async updateSeedlingBatchStatus(
    id: string,
    data: UpdateSeedlingBatchStatusDto,
  ): Promise<GenericResponse> {
    const batch = await this.prismaService.seedlingBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return {
        status: 404,
        data: null,
        message: 'Seedling batch not found',
      };
    }

    const updateData: any = {
      status: data.status,
    };

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const updatedBatch = await this.prismaService.seedlingBatch.update({
      where: { id },
      data: updateData,
      include: {
        currentStage: true,
      },
    });

    return {
      status: 200,
      data: updatedBatch,
      message: 'Seedling batch status updated successfully',
    };
  }

  async removeSeedlingBatch(id: string): Promise<GenericResponse> {
    await this.prismaService.seedlingBatch.delete({
      where: { id },
    });

    return {
      status: 200,
      data: null,
      message: 'Seedling batch deleted successfully',
    };
  }
}

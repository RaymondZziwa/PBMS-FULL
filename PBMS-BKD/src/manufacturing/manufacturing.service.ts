import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { InventoryRecordCategory, ManufacturingStatus, Prisma } from '@prisma/client';
import {
  CreateManufacturingDto,
  UpdateManufacturingDto,
  CompleteManufacturingDto,
} from 'src/dto/manufacturing.dto';

@Injectable()
export class ManufacturingService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateManufacturingDto): Promise<GenericResponse> {
    // Use transaction to ensure all operations succeed or fail together
    return await this.prismaService.$transaction(async (tx) => {
      // 1. Validate store exists
      const store = await tx.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      // 2. Check if employee is authorized to operate on this store
      const authorizedPersonnel = (store.authorizedPersonnel as string[]) || [];
      if (!authorizedPersonnel.includes(dto.manufacturedBy)) {
        throw new ForbiddenException(
          'You are not authorized to perform operations in this store',
        );
      }

      // 3. Validate primary unit exists and is L or KG
      const primaryUnit = await tx.unit.findUnique({
        where: { id: dto.primaryUnitId },
      });
      if (!primaryUnit) {
        throw new NotFoundException('Primary unit not found');
      }

      // Validate that primary unit is L or KG
      const unitName = primaryUnit.name.toUpperCase();
      const unitAbr = (primaryUnit.abr || '').toUpperCase();
      const isLitreOrKg =
        unitName.includes('LITRE') ||
        unitName.includes('LITER') ||
        unitAbr === 'L' ||
        unitName.includes('KILOGRAM') ||
        unitName.includes('KILO') ||
        unitAbr === 'KG';

      if (!isLitreOrKg) {
        throw new BadRequestException(
          'Primary unit must be Litres (L) or Kilograms (KG)',
        );
      }

      // 4. Validate packing unit exists
      const unit = await tx.unit.findUnique({
      where: { id: dto.unitId },
      });
      if (!unit) {
        throw new NotFoundException('Packing unit not found');
      }

      // 5. Validate employee exists
      const employee = await tx.employee.findUnique({
        where: { id: dto.manufacturedBy },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      // 6. Validate all items exist and check inventory availability
      const itemIds = dto.items.map((item) => item.itemId);
      const items = await tx.item.findMany({
        where: { id: { in: itemIds } },
      });

      if (items.length !== dto.items.length) {
        throw new NotFoundException('One or more items not found');
      }

      // 7. Check inventory availability and create depletion records for all items
      interface FailedItem {
        itemName: string;
        reason: string;
      }
      const depletionRecords: any[] = [];
      const failedItems: FailedItem[] = [];

      for (const manufacturingItem of dto.items) {
        // Find the item's inventory in the store
        // An item can exist in a store with different units (unique constraint: itemId, storeId, unitId)
        const productInventories = await tx.productInventory.findMany({
          where: {
            itemId: manufacturingItem.itemId,
            storeId: dto.storeId,
          },
          include: {
            unit: true,
          },
        });

        if (productInventories.length === 0) {
          const item = items.find((i) => i.id === manufacturingItem.itemId);
          failedItems.push({
            itemName: item?.name || manufacturingItem.itemName,
            reason: 'Item not found in store inventory',
          });
          continue;
        }

        // Try to find inventory entry with unit matching primary unit (L or KG)
        // We need to deplete items that are in the same unit as the primary unit
        const productInventory = productInventories.find(
          (inv) => inv.unitId === dto.primaryUnitId,
        );

        // If no exact unit match, item is not available in the required primary unit
        if (!productInventory) {
          const item = items.find((i) => i.id === manufacturingItem.itemId);
          failedItems.push({
            itemName: item?.name || manufacturingItem.itemName,
            reason: `Item not available in ${primaryUnit.name} (${primaryUnit.abr || ''}) unit. Please ensure the item is stocked in the selected primary unit.`,
          });
          continue;
        }

        // Check if sufficient quantity is available
        if (productInventory.qty < manufacturingItem.quantity) {
          const item = items.find((i) => i.id === manufacturingItem.itemId);
          failedItems.push({
            itemName: item?.name || manufacturingItem.itemName,
            reason: `Insufficient stock. Available: ${productInventory.qty}, Required: ${manufacturingItem.quantity}`,
          });
          continue;
        }

        // Reduce inventory quantity
        const newQty = productInventory.qty - manufacturingItem.quantity;
        await tx.productInventory.update({
          where: { id: productInventory.id },
          data: { qty: newQty },
        });

        // Create depletion record using the primary unit ID
        const depletionRecord = await tx.inventoryRecord.create({
          data: {
            itemId: manufacturingItem.itemId,
            storeId: dto.storeId,
            unitId: dto.primaryUnitId, // Use the primary unit ID for depletion
            category: InventoryRecordCategory.DEPLETION,
            qty: manufacturingItem.quantity,
            remainingQuantity: newQty,
            source: 'MANUFACTURING',
            description: `Manufacturing depletion for ${manufacturingItem.itemName}`,
            recordedBy: dto.manufacturedBy,
          },
        });

        depletionRecords.push(depletionRecord);
      }

      // 7. If any items failed, throw error and rollback transaction
      if (failedItems.length > 0) {
        const errorMessages = failedItems
          .map((item) => `${item.itemName}: ${item.reason}`)
          .join('; ');
        throw new BadRequestException(
          `Failed to create depletion records for some items: ${errorMessages}. Manufacturing record was not created.`,
        );
      }

      // 8. Create manufacturing record only if all depletion records were created successfully
      const manufacturing = await tx.manufacturing.create({
      data: {
          storeId: dto.storeId,
          primaryUnitId: dto.primaryUnitId,
        unitId: dto.unitId,
          totalQuantity: dto.totalQuantity,
          estimatedOutput: dto.estimatedOutput,
          status: ManufacturingStatus.PENDING, // Initial status is PENDING
          items: JSON.parse(JSON.stringify(dto.items)) as Prisma.InputJsonValue,
        manufacturedBy: dto.manufacturedBy,
        notes: dto.notes,
      },
        include: {
          store: {
            include: {
              branch: true,
              dept: true,
            },
          },
          primaryUnit: true,
          unit: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        status: 200,
        data: {
          manufacturing,
          depletionRecords,
        },
        message:
          'Manufacturing record created successfully with all depletion records',
      };
    });
  }

  async findAll(): Promise<GenericResponse> {
    const manufacturings = await this.prismaService.manufacturing.findMany({
      include: {
        store: {
          include: {
            branch: true,
            dept: true,
          },
        },
        primaryUnit: true,
        unit: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      status: 200,
      data: manufacturings,
      message: 'Manufacturing records fetched successfully',
    };
  }

  async findOne(id: string): Promise<GenericResponse> {
    const manufacturing = await this.prismaService.manufacturing.findUnique({
      where: { id },
      include: {
        store: {
          include: {
            branch: true,
            dept: true,
          },
        },
        primaryUnit: true,
        unit: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!manufacturing) {
      throw new NotFoundException('Manufacturing record not found');
    }

    return {
      status: 200,
      data: manufacturing,
      message: 'Manufacturing record fetched successfully',
    };
  }

  async update(
    id: string,
    dto: UpdateManufacturingDto,
  ): Promise<GenericResponse> {
    // Check if manufacturing record exists
    const existing = await this.prismaService.manufacturing.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Manufacturing record not found');
    }

    // Validate store if provided
    if (dto.storeId) {
      const store = await this.prismaService.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store) {
        throw new NotFoundException('Store not found');
      }
    }

    // Validate primary unit if provided
    if (dto.primaryUnitId) {
      const primaryUnit = await this.prismaService.unit.findUnique({
        where: { id: dto.primaryUnitId },
      });
      if (!primaryUnit) {
        throw new NotFoundException('Primary unit not found');
      }
    }

    // Validate packing unit if provided
    if (dto.unitId) {
      const unit = await this.prismaService.unit.findUnique({
        where: { id: dto.unitId },
      });
      if (!unit) {
        throw new NotFoundException('Packing unit not found');
      }
    }

    // Update manufacturing record
    const updateData: Prisma.ManufacturingUncheckedUpdateInput = {};
    if (dto.storeId) updateData.storeId = dto.storeId;
    if (dto.primaryUnitId) updateData.primaryUnitId = dto.primaryUnitId;
    if (dto.unitId) updateData.unitId = dto.unitId;
    if (dto.totalQuantity !== undefined)
      updateData.totalQuantity = dto.totalQuantity;
    if (dto.estimatedOutput !== undefined)
      updateData.estimatedOutput = dto.estimatedOutput;
    if (dto.actualOutput !== undefined) updateData.actualOutput = dto.actualOutput;
    if (dto.items)
      updateData.items = JSON.parse(
        JSON.stringify(dto.items),
      ) as Prisma.InputJsonValue; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const manufacturing = await this.prismaService.manufacturing.update({
      where: { id },
      data: updateData,
      include: {
        store: {
          include: {
            branch: true,
            dept: true,
          },
        },
        primaryUnit: true,
        unit: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: manufacturing,
      message: 'Manufacturing record updated successfully',
    };
  }

  async completeManufacturing(
    id: string,
    dto: CompleteManufacturingDto,
  ): Promise<GenericResponse> {
    // Check if manufacturing record exists
    const existing = await this.prismaService.manufacturing.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Manufacturing record not found');
    }

    if (existing.status !== ManufacturingStatus.PENDING) {
      throw new BadRequestException(
        'Manufacturing record has already been completed',
      );
    }

    // Calculate status based on actual vs estimated output
    let status: ManufacturingStatus = ManufacturingStatus.NORMAL;
    const difference = existing.estimatedOutput - dto.actualOutput;

    if (dto.actualOutput > existing.estimatedOutput) {
      // Actual output is more than estimated - good utilization
      status = ManufacturingStatus.GOOD_UTILIZATION;
    } else if (difference >= 5) {
      // Actual output is less than estimated by 5 or more - wastage detected
      status = ManufacturingStatus.WASTAGE_DETECTED;
    } else {
      // Difference is less than 5 - normal
      status = ManufacturingStatus.NORMAL;
    }

    // Update manufacturing record with actual output and status
    const manufacturing = await this.prismaService.manufacturing.update({
      where: { id },
      data: {
        actualOutput: dto.actualOutput,
        status: status,
      },
      include: {
        store: {
          include: {
            branch: true,
            dept: true,
          },
        },
        primaryUnit: true,
        unit: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 200,
      data: manufacturing,
      message: `Manufacturing record completed. Status: ${status.replace('_', ' ').toLowerCase()}`,
    };
  }

  async remove(id: string): Promise<GenericResponse> {
    // Check if manufacturing record exists
    const existing = await this.prismaService.manufacturing.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Manufacturing record not found');
    }

    // Delete manufacturing record
    const manufacturing = await this.prismaService.manufacturing.delete({
      where: { id },
    });

    return {
      status: 200,
      data: manufacturing,
      message: 'Manufacturing record deleted successfully',
    };
  }
}

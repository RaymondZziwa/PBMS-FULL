// stock-movement.service.ts
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InventoryRecordCategory } from '@prisma/client';
import { CreateExpoStockMovementDto } from 'src/dto/exhibition.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class ExhibitionStockMovementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExpoStockMovementDto) {
    const {
      itemId,
      storeId,
      unitId,
      qty,
      category,
      employeeId,
      description,
      source,
    } = dto;
    // 1. Check store & authorization
    const store = await this.prisma.exhibitionStore.findUnique({
      where: { id: storeId },
    });
    if (!store) throw new NotFoundException('Store not found');

    // 2. Find existing exhibitionInventory record
    let exhibitionInventory = await this.prisma.exhibitionInventory.findFirst({
      where: { itemId, storeId, unitId },
    });

    if (category === InventoryRecordCategory.RESTOCK) {
      if (!exhibitionInventory) {
        // Create a new inventory entry
        exhibitionInventory = await this.prisma.exhibitionInventory.create({
          data: {
            itemId,
            storeId,
            qty,
            unitId,
            category: 'RESTOCK',
          },
        });
      } else {
        // Increase qty
        exhibitionInventory = await this.prisma.exhibitionInventory.update({
          where: { id: exhibitionInventory.id },
          data: { qty: exhibitionInventory.qty + qty },
        });
      }
    }

    if (category === InventoryRecordCategory.DEPLETION) {
      if (!exhibitionInventory)
        throw new NotFoundException('Item not found in store');
      if (exhibitionInventory.qty < qty)
        throw new ForbiddenException('Insufficient stock');

      exhibitionInventory = await this.prisma.exhibitionInventory.update({
        where: { id: exhibitionInventory.id },
        data: { qty: exhibitionInventory.qty - qty },
      });
    }

    if (category === InventoryRecordCategory.ADJUSTMENT) {
      if (!exhibitionInventory) {
        // Adjustment can also create a record
        exhibitionInventory = await this.prisma.exhibitionInventory.create({
          data: {
            itemId,
            storeId,
            unitId,
            qty,
            category: 'ADJUSTMENT',
          },
        });
      } else {
        exhibitionInventory = await this.prisma.exhibitionInventory.update({
          where: { id: exhibitionInventory.id },
          data: { qty },
        });
      }
    }

    // 3. Log movement in InventoryRecord
    await this.prisma.exhibitionInventoryRecord.create({
      data: {
        itemId,
        storeId,
        unitId,
        category,
        qty,
        source: source,
        description,
        recordedBy: employeeId,
      },
    });

    return {
      status: 200,
      message: 'Stock movement recorded successfully',
      data: exhibitionInventory,
    };
  }

  async getAllStockMovementRecords() {
    try {
      const records = await this.prisma.exhibitionInventoryRecord.findMany({
        include: {
          item: true,
          store: true,
          unit: true,
          employee: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        status: 200,
        message: 'Exhibition Stock movement records fetched successfully',
        data: records,
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findAllWithStoreQuantity(storeId: string): Promise<GenericResponse> {
    const store = await this.prisma.exhibitionStore.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      return {
        status: 404,
        data: [],
        message: 'Store not found',
      };
    }

    const items = await this.prisma.exhibitionInventory.findMany({
      where: { storeId },
      include: {
        item: {
          include: {
            category: true,
          },
        },
        store: true,
        unit: true,
      },
    });

    return {
      status: 200,
      data: items,
      message: 'Selected store inventory fetched successfully',
    };
  }

  async getAllExhibitionStores() {
    try {
      const stores = await this.prisma.exhibitionStore.findMany({
        include: {
          exhibition: true,
        },
      });

      return {
        status: 200,
        data: stores,
        message: 'Exhibition stores fetched successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
}

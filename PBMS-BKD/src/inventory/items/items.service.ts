import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateEAN13 } from 'src/utils/barcodeGenerator';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class ItemService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    categoryId: number;
    name: string;
    price: number;
    showInPos: boolean;
  }): Promise<GenericResponse> {
    // Generate barcode
    const barcode = generateEAN13();

    // Include barcode in creation data
    const item = await this.prismaService.item.create({
      data: {
        ...data,
        barcode,
      },
    });

    return {
      status: 200,
      data: item,
      message: 'Item created successfully',
    };
  }

  async findAll(): Promise<GenericResponse> {
    const items = await this.prismaService.item.findMany({
      include: {
        category: true,
      },
    });
    return {
      status: 200,
      data: items,
      message: 'Items fetched successfully',
    };
  }

  async findAllWithStoreQuantity(storeId: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      return {
        status: 404,
        data: [],
        message: 'Store not found',
      };
    }

    const items = await this.prismaService.productInventory.findMany({
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

  async findOne(id: number): Promise<GenericResponse> {
    const item = await this.prismaService.item.findUnique({
      where: { id },
    });
    return {
      status: 200,
      data: item,
      message: 'Item fetched successfully',
    };
  }

  async update(
    id: number,
    data: {
      categoryId?: number;
      name?: string;
      price?: number;
    },
  ): Promise<GenericResponse> {
    const updateData: any = {
      name: data.name,
      price: data.price,
    };

    if (data.categoryId) {
      const exists = await this.prismaService.itemCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!exists) {
        throw new BadRequestException('Invalid category');
      }

      updateData.categoryId = {
        connect: { id: data.categoryId },
      };
    }

    const item = await this.prismaService.item.update({
      where: { id },
      data: updateData,
    });

    return {
      status: 200,
      data: item,
      message: 'Item modified successfully',
    };
  }

  async remove(id: number): Promise<GenericResponse> {
    const item = await this.prismaService.item.delete({
      where: { id },
    });
    return {
      status: 200,
      data: item,
      message: 'Item deleted successfully',
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import {
  ExhibitionCreateSaleDto,
  UpdateExhibitionSaleDto,
} from 'src/dto/pos.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExhibitionSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSaleDto: ExhibitionCreateSaleDto) {
    const {
      customerId,
      servedBy,
      storeId,
      items,
      paymentMethods,
      notes,
      total,
      balance,
      status,
    } = createSaleDto;

    // Ensure required IDs are provided
    if (!customerId) throw new BadRequestException('Customer ID is required');
    if (!servedBy)
      throw new BadRequestException('ServedBy (cashier) is required');
    if (!storeId) throw new BadRequestException('Store ID is required');

    const itemIds = items.map((item) => item.id);

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch current inventory for all items in the store
      const inventories = await tx.exhibitionInventory.findMany({
        where: { storeId, itemId: { in: itemIds } },
      });

      // 2️⃣ Check stock
      for (const saleItem of items) {
        const inventory = inventories.find((inv) => inv.itemId === saleItem.id);
        if (!inventory || inventory.qty < saleItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item "${saleItem.name}". Available: ${inventory?.qty ?? 0}, Required: ${saleItem.quantity}`,
          );
        }
      }

      // 3️⃣ Reduce inventory
      for (const saleItem of items) {
        const inventory = inventories.find(
          (inv) => inv.itemId === saleItem.id,
        )!;
        await tx.exhibitionInventory.update({
          where: { id: inventory.id },
          data: { qty: inventory.qty - saleItem.quantity },
        });
      }

      // 4️⃣ Create the sale with proper relation connections
      const sale = await tx.exhibitionSales.create({
        data: {
          client: { connect: { id: customerId } },
          employee: { connect: { id: servedBy } },
          exhibitionStore: { connect: { id: storeId } },
          status,
          total,
          balance,
          paymentMethods: JSON.parse(JSON.stringify(paymentMethods)),
          notes,
          items: JSON.parse(JSON.stringify(items)),
        },
        include: {
          client: true,
          exhibitionStore: true,
          employee: true,
        },
      });

      return {
        message: 'Sale created successfully',
        data: sale,
      };
    });
  }

  async findAll() {
    return this.prisma.exhibitionSales.findMany({
      include: {
        client: true,
        exhibitionStore: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.exhibitionSales.findUnique({
      where: { id },
      include: {
        client: true,
        exhibitionStore: true,
        employee: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async update(id: string, updateSaleDto: UpdateExhibitionSaleDto) {
    // 1️⃣ Check if sale exists
    const existingSale = await this.prisma.sale.findUnique({
      where: { id },
    });

    if (!existingSale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    // 2️⃣ Optional: Validate SaleStatus if provided
    if (
      updateSaleDto.status &&
      !Object.values(SaleStatus).includes(updateSaleDto.status)
    ) {
      throw new Error(`Invalid sale status: ${updateSaleDto.status}`);
    }

    // 3️⃣ Update the sale
    const updatedSale = await this.prisma.exhibitionSales.update({
      where: { id },
      data: updateSaleDto,
      include: {
        client: true,
        exhibitionStore: true,
        employee: true,
      },
    });

    // 4️⃣ Return formatted response
    return {
      message: 'Sale updated successfully',
      data: updatedSale,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.exhibitionSales.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException(`Sale with ID ${id} not found`);

    await this.prisma.exhibitionSales.delete({ where: { id } });

    return { message: 'Sale deleted successfully' };
  }
}

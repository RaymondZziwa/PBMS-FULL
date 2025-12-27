import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import {
  CollectCreditPaymentDto,
  CreateSaleDto,
  UpdateSaleDto,
} from 'src/dto/pos.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
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

    const itemIds = items.map((item) => item.id);

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Fetch current inventory for all items in the store
      const inventories = await tx.productInventory.findMany({
        where: {
          storeId,
          itemId: { in: itemIds },
        },
      });

      // 2️⃣ Check if all items have sufficient quantity
      for (const saleItem of items) {
        const inventory = inventories.find((inv) => inv.itemId === saleItem.id);
        if (!inventory || inventory.qty < saleItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item "${saleItem.name}". Available: ${inventory?.qty ?? 0}, Required: ${saleItem.quantity}`,
          );
        }
      }

      // 3️⃣ Reduce inventory quantities
      for (const saleItem of items) {
        const inventory = inventories.find((inv) => inv.itemId === saleItem.id);

        if (!inventory) {
          throw new BadRequestException(
            `Inventory record not found for item "${saleItem.name}"`,
          );
        }
        await tx.productInventory.update({
          where: { id: inventory?.id },
          data: { qty: inventory?.qty - saleItem.quantity },
        });
      }

      // 4️⃣ Create the sale
      const sale = await tx.sale.create({
        data: {
          clientId: customerId,
          servedBy,
          storeId,
          status,
          total,
          balance,
          paymentMethods: JSON.parse(JSON.stringify(paymentMethods)),
          notes,
          items: JSON.parse(JSON.stringify(items)),
        },
        include: {
          client: true,
          store: true,
          employee: true,
        },
      });

      if (balance > 0) {
        await Promise.all(
          paymentMethods.map((method) =>
            this.prisma.salePayments.create({
              data: {
                saleId: sale.id,
                amount: method.amount,
                paymentMethod: method.type,
                referenceId: '',
                notes: notes,
                cashierId: servedBy,
              },
            }),
          ),
        );
      }

      return {
        message: 'Sale created successfully',
        data: sale,
        status: 200,
      };
    });
  }

  async findAll() {
    return this.prisma.sale.findMany({
      include: {
        client: true,
        store: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findCreditSales(id: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        balance: {
          gt: 0,
        },
        storeId: id,
      },
      include: {
        client: true,
        store: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Credit sales retrieved successfully',
      data: sales,
      status: 200,
    };
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        store: true,
        employee: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }

    return sale;
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
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
    const updatedSale = await this.prisma.sale.update({
      where: { id },
      data: updateSaleDto,
      include: {
        client: true,
        store: true,
        employee: true,
      },
    });

    // 4️⃣ Return formatted response
    return {
      message: 'Sale updated successfully',
      data: updatedSale,
    };
  }

  async collectCreditPayment(dto: CollectCreditPaymentDto) {
    const sale = await this.findOne(dto.saleId);
    if (!sale) throw new NotFoundException('Sale not found');

    if (Number(sale.balance) <= 0)
      throw new BadRequestException('Sale is already fully paid');

    if (dto.amountPaid > Number(sale.balance))
      throw new BadRequestException(
        'Payment amount exceeds outstanding balance',
      );

    // Update sale balance and status
    const newBalance = Number(sale.balance) - dto.amountPaid;
    const newStatus =
      newBalance === 0 ? SaleStatus.FULLY_PAID : SaleStatus.PARTIALLY_PAID;

    const updatedSale = await this.prisma.sale.update({
      where: { id: dto.saleId },
      data: {
        balance: newBalance,
        status: newStatus,
      },
    });

    // Record the payment
    await Promise.all(
      dto.paymentMethods.map((method) =>
        this.prisma.salePayments.create({
          data: {
            saleId: dto.saleId,
            amount: method.amount, // individual amount per method
            paymentMethod: method.type, // individual payment type
            referenceId: dto.referenceId,
            notes: dto.notes,
            cashierId: dto.servedBy,
          },
        }),
      ),
    );

    return {
      message: 'Payment collected successfully',
      data: updatedSale,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.sale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sale with ID ${id} not found`);

    await this.prisma.sale.delete({ where: { id } });

    return { message: 'Sale deleted successfully' };
  }
}

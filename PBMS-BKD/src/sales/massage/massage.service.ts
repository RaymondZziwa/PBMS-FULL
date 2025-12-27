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
export class MassageSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto) {
    const {
      customerId,
      servedBy,
      items,
      paymentMethods,
      notes,
      total,
      balance,
      status,
    } = createSaleDto;

    // Create the sale
    const sale = await this.prisma.massageSales.create({
      data: {
        clientId: customerId,
        servedBy,
        status,
        total,
        balance,
        paymentMethods: JSON.parse(JSON.stringify(paymentMethods)),
        notes,
        items: JSON.parse(JSON.stringify(items)),
      },
      include: {
        client: true,
        employee: true,
      },
    });

    if (balance > 0) {
      await Promise.all(
        paymentMethods.map((method) =>
          this.prisma.massageServicePayments.create({
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
  }

  async findAll() {
    const sales = await this.prisma.massageSales.findMany({
      include: {
        client: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Massage sales retrieved successfully',
      data: sales,
      status: 200,
    };
  }

  async findMassageCreditSales() {
    const sales = await this.prisma.massageSales.findMany({
      where: {
        balance: {
          gt: 0,
        },
      },
      include: {
        client: true,
        employee: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Credit massage sales retrieved successfully',
      data: sales,
      status: 200,
    };
  }

  async findOne(id: string) {
    const sale = await this.prisma.massageSales.findUnique({
      where: { id },
      include: {
        client: true,
        employee: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Massage sale with ID ${id} not found`);
    }

    return {
      message: 'Massage sale retrieved successfully',
      data: sale,
      status: 200,
    };
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    // Check if sale exists
    const existingSale = await this.prisma.massageSales.findUnique({
      where: { id },
    });

    if (!existingSale) {
      throw new NotFoundException(`Massage sale with ID ${id} not found`);
    }

    // Validate SaleStatus if provided
    if (
      updateSaleDto.status &&
      !Object.values(SaleStatus).includes(updateSaleDto.status)
    ) {
      throw new BadRequestException(
        `Invalid sale status: ${updateSaleDto.status}`,
      );
    }

    // Update the sale
    const updatedSale = await this.prisma.massageSales.update({
      where: { id },
      data: updateSaleDto,
      include: {
        client: true,
        employee: true,
      },
    });

    // Return formatted response
    return {
      message: 'Massage sale updated successfully',
      data: updatedSale,
      status: 200,
    };
  }

  async collectCreditPayment(dto: CollectCreditPaymentDto) {
    const sale = await this.prisma.massageSales.findUnique({
      where: { id: dto.saleId },
    });

    if (!sale) throw new NotFoundException('Massage sale not found');

    if (Number(sale.balance) <= 0)
      throw new BadRequestException('Massage sale is already fully paid');

    if (dto.amountPaid > Number(sale.balance))
      throw new BadRequestException(
        'Payment amount exceeds outstanding balance',
      );

    // Update sale balance and status
    const newBalance = Number(sale.balance) - dto.amountPaid;
    const newStatus =
      newBalance === 0 ? SaleStatus.FULLY_PAID : SaleStatus.PARTIALLY_PAID;

    const updatedSale = await this.prisma.massageSales.update({
      where: { id: dto.saleId },
      data: {
        balance: newBalance,
        status: newStatus,
      },
      include: {
        client: true,
        employee: true,
      },
    });

    // Record the payment
    await Promise.all(
      dto.paymentMethods.map((method) =>
        this.prisma.massageServicePayments.create({
          data: {
            saleId: dto.saleId,
            amount: method.amount,
            paymentMethod: method.type,
            referenceId: dto.referenceId || '',
            notes: dto.notes,
            cashierId: dto.servedBy,
          },
        }),
      ),
    );

    return {
      message: 'Massage service payment collected successfully',
      data: updatedSale,
      status: 200,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.massageSales.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Massage sale with ID ${id} not found`);
    }

    await this.prisma.massageSales.delete({ where: { id } });

    return {
      message: 'Massage sale deleted successfully',
      status: 200,
    };
  }
}

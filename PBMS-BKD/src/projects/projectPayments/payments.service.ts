// src/services/project-payments.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from 'src/dto/project.dto';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class ProjectPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async addPayment(createPaymentDto: CreatePaymentDto) {
    try {
      const { saleId, amount, paymentMethod, notes, exhibitionId, cashierId } =
        createPaymentDto;

      // Validate sale exists
      const sale = await this.prisma.projectSales.findUnique({
        where: { id: saleId },
      });

      if (!sale) {
        throw new BadRequestException('Sale not found');
      }

      // Validate cashier exists
      const cashier = await this.prisma.employee.findUnique({
        where: { id: cashierId },
      });

      if (!cashier) {
        throw new BadRequestException('Cashier not found');
      }

      // Calculate current total paid
      const currentPayments = await this.prisma.projectPayments.aggregate({
        where: { saleId },
        _sum: { amount: true },
      });

      const currentTotalPaid =
        currentPayments._sum.amount || new Prisma.Decimal(0);
      const saleTotal = sale.saleTotal;
      const newTotalPaid = currentTotalPaid.plus(amount);

      // Validate payment doesn't exceed sale total
      if (newTotalPaid.greaterThan(saleTotal)) {
        throw new BadRequestException(
          `Payment amount exceeds remaining balance. Maximum allowed: ${saleTotal.minus(currentTotalPaid)}`,
        );
      }

      // Create payment
      const payment = await this.prisma.projectPayments.create({
        data: {
          saleId,
          amount,
          paymentMethod,
          notes,
          exhibitionId,
          cashierId,
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          projectSale: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      // Update sale status based on new payment total
      await this.updateSaleStatus(saleId, newTotalPaid, saleTotal);

      return {
        status: 201,
        data: payment,
        message: 'Payment added successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async modifyPayment(id: string, updatePaymentDto: UpdatePaymentDto) {
    try {
      // Check if payment exists
      const existingPayment = await this.prisma.projectPayments.findUnique({
        where: { id },
        include: {
          projectSale: true,
        },
      });

      if (!existingPayment) {
        throw new NotFoundException('Payment not found');
      }

      const { amount, paymentMethod, referenceId, notes, cashierId } =
        updatePaymentDto;

      // Validate cashier if provided
      if (cashierId) {
        const cashier = await this.prisma.employee.findUnique({
          where: { id: cashierId },
        });

        if (!cashier) {
          throw new BadRequestException('Cashier not found');
        }
      }

      // If amount is being modified, validate it doesn't exceed sale total
      if (amount !== undefined) {
        const currentPayments = await this.prisma.projectPayments.aggregate({
          where: {
            saleId: existingPayment.saleId,
            NOT: { id }, // Exclude current payment being modified
          },
          _sum: { amount: true },
        });

        const otherPaymentsTotal =
          currentPayments._sum.amount || new Prisma.Decimal(0);
        const newTotalPaid = otherPaymentsTotal.plus(amount);
        const saleTotal = existingPayment.projectSale.saleTotal;

        if (newTotalPaid.greaterThan(saleTotal)) {
          throw new BadRequestException(
            `Updated payment amount exceeds sale total. Maximum allowed: ${saleTotal.minus(otherPaymentsTotal)}`,
          );
        }

        // Update sale status if amount changed
        await this.updateSaleStatus(
          existingPayment.saleId,
          newTotalPaid,
          saleTotal,
        );
      }

      // Build update data with proper typing
      const updateData: Prisma.ProjectPaymentsUpdateInput = {};

      if (amount !== undefined) updateData.amount = amount;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (referenceId !== undefined) updateData.referenceId = referenceId;
      if (notes !== undefined) updateData.notes = notes;

      // If no fields to update, return early
      if (Object.keys(updateData).length === 0) {
        return {
          status: 200,
          data: existingPayment,
          message: 'No changes detected',
        };
      }

      // Update payment
      const updatedPayment = await this.prisma.projectPayments.update({
        where: { id },
        data: updateData,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          projectSale: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        status: 200,
        data: updatedPayment,
        message: 'Payment updated successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async deletePayment(id: string) {
    try {
      // Check if payment exists
      const payment = await this.prisma.projectPayments.findUnique({
        where: { id },
        include: {
          projectSale: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      const result = await this.prisma.$transaction(async (tx) => {
        // Delete the payment
        const deletedPayment = await tx.projectPayments.delete({
          where: { id },
        });

        // Recalculate total paid and update sale status
        const currentPayments = await tx.projectPayments.aggregate({
          where: { saleId: payment.saleId },
          _sum: { amount: true },
        });

        const currentTotalPaid =
          currentPayments._sum.amount || new Prisma.Decimal(0);
        const saleTotal = payment.projectSale.saleTotal;

        await this.updateSaleStatus(
          payment.saleId,
          currentTotalPaid,
          saleTotal,
          tx,
        );

        return deletedPayment;
      });

      return {
        status: 200,
        data: result,
        message: 'Payment deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getPayment(id: string) {
    try {
      const payment = await this.prisma.projectPayments.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          projectSale: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  contact: true,
                },
              },
              project: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      return {
        status: 200,
        data: payment,
        message: 'Payment retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  async getPaymentsBySale(saleId: string) {
    try {
      const payments = await this.prisma.projectPayments.findMany({
        where: { saleId },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalPaid = await this.prisma.projectPayments.aggregate({
        where: { saleId },
        _sum: { amount: true },
      });

      return {
        status: 200,
        data: {
          payments,
          summary: {
            totalPayments: payments.length,
            totalPaid: totalPaid._sum.amount || 0,
          },
        },
        message: 'Payments retrieved successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async getPaymentSummary(saleId: string) {
    try {
      const [payments, totalPaid, sale] = await Promise.all([
        this.prisma.projectPayments.findMany({
          where: { saleId },
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.projectPayments.aggregate({
          where: { saleId },
          _sum: { amount: true },
        }),
        this.prisma.projectSales.findUnique({
          where: { id: saleId },
          select: {
            saleTotal: true,
            downPayment: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            project: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

      if (!sale) {
        throw new NotFoundException('Sale not found');
      }

      const totalPaidAmount = totalPaid._sum.amount || new Prisma.Decimal(0);
      const remainingBalance = sale.saleTotal.minus(totalPaidAmount);
      const paymentProgress = sale.saleTotal.greaterThan(0)
        ? totalPaidAmount.dividedBy(sale.saleTotal).times(100).toNumber()
        : 0;

      return {
        status: 200,
        data: {
          payments,
          summary: {
            totalPayments: payments.length,
            totalPaid: totalPaidAmount,
            saleTotal: sale.saleTotal,
            remainingBalance,
            paymentProgress,
            client: sale.client,
            project: sale.project,
          },
        },
        message: 'Payment summary retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  private async updateSaleStatus(
    saleId: string,
    totalPaid: Prisma.Decimal,
    saleTotal: Prisma.Decimal,
    prisma: any = this.prisma,
  ) {
    const totalPaidNum = totalPaid.toNumber();
    const saleTotalNum = saleTotal.toNumber();

    let status: string;

    if (totalPaidNum >= saleTotalNum) {
      status = 'FULLY_PAID';
    } else if (totalPaidNum > 0) {
      status = 'PARTIALLY_PAID';
    } else {
      status = 'UNPAID';
    }

    await prisma.projectSales.update({
      where: { id: saleId },
      data: { status },
    });
  }

  async uploadProjectPaymentBankDepositSlip(
    paymentId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    const imagePath = `/uploads/project-bank-deposit-slips/${file.filename}`;

    // ✅ Optional: delete old image
    const payment = await this.prisma.projectPayments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.bankDepositSlipImage) {
      const filePath = join(
        process.cwd(),
        'uploads/project-bank-deposit-slips',
      );
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn('Delivery note image deletion failed:', err);
      }
    }

    // ✅ Update database
    await this.prisma.projectPayments.update({
      where: { id: paymentId },
      data: { bankDepositSlipImage: imagePath },
    });

    return {
      message: 'Bank deposit slip image updated successfully',
      imageUrl: imagePath,
    };
  }

  async uploadProjectPaymentReceipt(
    paymentId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    const imagePath = `/uploads/project-payment-receipts/${file.filename}`;

    // ✅ Optional: delete old image
    const payment = await this.prisma.projectPayments.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.receiptImage) {
      const filePath = join(process.cwd(), 'uploads/project-payment-receipts');
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn('Project payment receipt image deletion failed:', err);
      }
    }

    // ✅ Update database
    await this.prisma.projectPayments.update({
      where: { id: paymentId },
      data: { receiptImage: imagePath },
    });

    return {
      message: 'Payment receipt image updated successfully',
      imageUrl: imagePath,
    };
  }
}

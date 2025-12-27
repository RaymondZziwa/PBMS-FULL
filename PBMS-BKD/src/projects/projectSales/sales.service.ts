import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SaleStatus, Prisma } from '@prisma/client';
import {
  CreateProjectSaleDto,
  UpdateProjectSaleDto,
  AddPaymentDto,
} from 'src/dto/project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { join } from 'path';
import { unlink } from 'fs/promises';
@Injectable()
export class ProjectSalesService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectSaleDto: CreateProjectSaleDto) {
    try {
      const {
        clientId,
        projectId,
        cashierId,
        initialPayments = [],
        ...saleData
      } = createProjectSaleDto;

      // Validate references exist
      await this.validateReferences(clientId, projectId, cashierId);

      // Validate financial logic
      this.validateSaleFinancials(createProjectSaleDto);

      console.log('Creating sale with:', {
        clientId,
        projectId,
        cashierId,
        saleData,
      });

      // Calculate initial status with proper type
      const initialStatus = this.calculateInitialStatus(
        saleData.downPayment,
        saleData.saleTotal,
      );

      // Step 1: Create the sale first
      const projectSale = await this.prisma.projectSales.create({
        data: {
          clientId,
          projectId,
          cashierId,
          ...saleData,
          status: initialStatus,
        },
      });

      // Step 2: Create down payment record
      if (saleData.downPayment > 0) {
        console.log('Creating down payment of:', saleData.downPayment);

        await this.prisma.projectPayments.create({
          data: {
            saleId: projectSale.id,
            amount: saleData.downPayment,
            paymentMethod: 'CASH',
            exhibitionId: createProjectSaleDto.exhibitionId || '',
            cashierId: cashierId,
          },
        });
        console.log('Down payment created');
      }

      // Step 3: Get complete sale with all relations
      const completeSale = await this.prisma.projectSales.findUnique({
        where: { id: projectSale.id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              contact: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          ProjectPayments: {
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!completeSale) {
        throw new NotFoundException('Sale not found after creation');
      }

      // Calculate computed fields
      const totalPaid = completeSale.ProjectPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount.toString()),
        0,
      );

      const saleTotal = parseFloat(completeSale.saleTotal.toString());
      const remainingBalance = Math.max(0, saleTotal - totalPaid);
      const paymentProgress = saleTotal > 0 ? (totalPaid / saleTotal) * 100 : 0;

      const result = {
        ...completeSale,
        totalPaid,
        remainingBalance,
        paymentProgress,
        paymentsMade: completeSale.ProjectPayments.length,
        nextInstallmentDue:
          await this.calculateNextInstallmentDue(completeSale),
      };

      console.log('Final result with payments:', result);

      return {
        status: 201,
        data: result,
        message: 'Project sale created successfully',
      };
    } catch (error) {
      console.log('Create project sale error:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findAll(page: number = 1, limit: number = 10, filters?: any) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters?.clientId) where.clientId = filters.clientId;
      if (filters?.projectId) where.projectId = filters.projectId;
      if (filters?.cashierId) where.cashierId = filters.cashierId;
      if (filters?.status) where.status = filters.status;
      if (filters?.startDate && filters?.endDate) {
        where.createdAt = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      const [sales, total] = await Promise.all([
        this.prisma.projectSales.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                contact: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            ProjectPayments: {
              include: {
                employee: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
        this.prisma.projectSales.count({ where }),
      ]);

      // Calculate remaining balance and payment progress
      const salesWithProgress = await Promise.all(
        sales.map(async (sale) => {
          const totalPaid = await this.calculateTotalPaid(sale.id);
          const saleTotalNum = parseFloat(sale.saleTotal.toString());
          const totalPaidNum = parseFloat(totalPaid.toString());
          const remainingBalance = saleTotalNum - totalPaidNum;
          const paymentProgress =
            saleTotalNum > 0 ? (totalPaidNum / saleTotalNum) * 100 : 0;

          return {
            ...sale,
            totalPaid: totalPaidNum,
            remainingBalance,
            paymentProgress,
            nextInstallmentDue: await this.calculateNextInstallmentDue(sale),
          };
        }),
      );

      return {
        status: 200,
        data: {
          sales: salesWithProgress,
          meta: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
        message: 'Project sales retrieved successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async findOne(id: string) {
    try {
      const sale = await this.prisma.projectSales.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              contact: true,
              address: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              price: true,
              barcode: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          ProjectPayments: {
            include: {
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!sale) {
        throw new NotFoundException(`Project sale with ID ${id} not found`);
      }

      const totalPaid = await this.calculateTotalPaid(id);
      const saleTotalNum = parseFloat(sale.saleTotal.toString());
      const totalPaidNum = parseFloat(totalPaid.toString());
      const remainingBalance = saleTotalNum - totalPaidNum;
      const paymentProgress =
        saleTotalNum > 0 ? (totalPaidNum / saleTotalNum) * 100 : 0;

      const result = {
        ...sale,
        totalPaid: totalPaidNum,
        remainingBalance,
        paymentProgress,
        nextInstallmentDue: await this.calculateNextInstallmentDue(sale),
      };

      return {
        status: 200,
        data: result,
        message: 'Project sale retrieved successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async update(id: string, updateProjectSaleDto: UpdateProjectSaleDto) {
    try {
      const sale = await this.findOne(id);

      // Prevent updates if significant payments have been made
      const totalPaid = await this.calculateTotalPaid(id);
      if (Number(totalPaid) > 0) {
        throw new BadRequestException(
          'Cannot update sale after payments have been made',
        );
      }

      if (updateProjectSaleDto.clientId) {
        await this.validateClient(updateProjectSaleDto.clientId);
      }
      if (updateProjectSaleDto.projectId) {
        await this.validateProject(updateProjectSaleDto.projectId);
      }
      if (updateProjectSaleDto.cashierId) {
        await this.validateEmployee(updateProjectSaleDto.cashierId);
      }

      const result = await this.prisma.projectSales.update({
        where: { id },
        data: updateProjectSaleDto,
        include: {
          client: true,
          project: true,
          employee: true,
          ProjectPayments: true,
        },
      });

      return {
        status: 200,
        data: result,
        message: 'Project sale updated successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async remove(id: string) {
    try {
      const sale = await this.findOne(id);

      // Check if payments have been made
      const totalPaid = await this.calculateTotalPaid(id);
      if (parseFloat(totalPaid.toString()) > 0) {
        throw new BadRequestException(
          'Cannot delete sale with existing payments',
        );
      }

      const result = await this.prisma.projectSales.delete({
        where: { id },
      });

      return {
        status: 200,
        data: result,
        message: 'Project sale deleted successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async addPayment(saleId: string, addPaymentDto: AddPaymentDto) {
    try {
      const saleResponse = await this.findOne(saleId);
      const sale = saleResponse.data;

      if (!addPaymentDto.exhibitionId) {
        throw new BadRequestException('exhibitionId is required');
      }

      // Validate cashier exists
      await this.validateEmployee(addPaymentDto.cashierId);

      const result = await this.prisma.$transaction(async (tx) => {
        // Create payment record
        const payment = await tx.projectPayments.create({
          data: {
            saleId,
            amount: addPaymentDto.amount,
            paymentMethod: addPaymentDto.paymentMethod || 'cash',
            exhibitionId: addPaymentDto.exhibitionId,
            cashierId: addPaymentDto.cashierId,
          },
        });

        // Calculate new total paid and update sale status
        const totalPaid = await this.calculateTotalPaid(saleId, tx as any);
        const saleTotalNum = parseFloat(sale.saleTotal.toString());
        await this.updateSaleStatus(saleId, totalPaid, saleTotalNum, tx as any);

        // Get updated sale with payments
        const updatedSale = await this.findOne(saleId);

        return {
          payment,
          sale: updatedSale,
        };
      });

      return {
        status: 201,
        data: result,
        message: 'Payment added successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async getPaymentSchedule(saleId: string) {
    try {
      const saleResponse = await this.findOne(saleId);
      const sale = saleResponse.data;
      const totalPaid = await this.calculateTotalPaid(saleId);

      const paymentsMade = sale.ProjectPayments.length;
      const paymentsRemaining = sale.numberOfInstallments - paymentsMade;
      const nextDueDate = this.calculateNextDueDate(
        sale.createdAt,
        paymentsMade,
      );

      const saleTotalNum = parseFloat(sale.saleTotal.toString());
      const totalPaidNum = parseFloat(totalPaid.toString());

      const result = {
        saleId: sale.id,
        clientName: `${sale.client.firstName} ${sale.client.lastName}`,
        projectName: sale.project.name,
        totalAmount: saleTotalNum,
        downPayment: parseFloat(sale.downPayment.toString()),
        numberOfInstallments: sale.numberOfInstallments,
        installmentAmount: parseFloat(sale.installmentAmount.toString()),
        paymentsMade,
        paymentsRemaining,
        totalPaid: totalPaidNum,
        remainingBalance: saleTotalNum - totalPaidNum,
        nextDueDate,
        paymentHistory: sale.ProjectPayments,
        expectedCompletionDate: this.calculateExpectedCompletionDate(
          sale.createdAt,
          sale.numberOfInstallments,
        ),
      };

      return {
        status: 200,
        data: result,
        message: 'Payment schedule retrieved successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async getSalesSummary(period?: 'day' | 'week' | 'month' | 'year') {
    try {
      const dateFilter = this.getDateFilter(period);

      const [totalSales, totalRevenue, totalPaid, statusCounts, recentSales] =
        await Promise.all([
          this.prisma.projectSales.count({ where: dateFilter }),
          this.prisma.projectSales.aggregate({
            where: dateFilter,
            _sum: { saleTotal: true },
          }),
          this.prisma.projectPayments.aggregate({
            where: dateFilter
              ? {
                  createdAt: dateFilter.createdAt,
                }
              : {},
            _sum: { amount: true },
          }),
          this.prisma.projectSales.groupBy({
            by: ['status'],
            where: dateFilter,
            _count: { id: true },
          }),
          this.prisma.projectSales.findMany({
            where: dateFilter,
            take: 5,
            orderBy: { createdAt: 'desc' },
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
          }),
        ]);

      const result = {
        totalSales,
        totalRevenue: totalRevenue._sum.saleTotal
          ? parseFloat(totalRevenue._sum.saleTotal.toString())
          : 0,
        totalPaid: totalPaid._sum.amount
          ? parseFloat(totalPaid._sum.amount.toString())
          : 0,
        statusCounts,
        recentSales,
      };

      return {
        status: 200,
        data: result,
        message: 'Sales summary retrieved successfully',
      };
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  // Helper Methods
  private async validateReferences(
    clientId: string,
    projectId: string,
    cashierId: string,
  ) {
    await Promise.all([
      this.validateClient(clientId),
      this.validateProject(projectId),
      this.validateEmployee(cashierId),
    ]);
  }

  private async validateClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) throw new BadRequestException('Client not found');
  }

  private async validateProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new BadRequestException('Project not found');
  }

  private async validateEmployee(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) throw new BadRequestException('Employee not found');
  }

  private validateSaleFinancials(dto: CreateProjectSaleDto) {
    const { saleTotal, downPayment, numberOfInstallments, installmentAmount } =
      dto;

    // Check if down payment is reasonable
    if (downPayment > saleTotal) {
      throw new BadRequestException('Down payment cannot exceed sale total');
    }

    // If paying in full (down payment equals sale total), installment amount should equal sale total
    if (downPayment >= saleTotal) {
      if (Math.abs(installmentAmount - saleTotal) > 0.01) {
        throw new BadRequestException(
          `For full payment, installment amount should equal sale total: ${saleTotal}, but got ${installmentAmount}`,
        );
      }
      return; // Skip further validation for full payment
    }

    // Only validate installment calculation for partial payments
    const calculatedInstallmentTotal = numberOfInstallments * installmentAmount;
    const remainingAfterDownPayment = saleTotal - downPayment;

    if (
      Math.abs(calculatedInstallmentTotal - remainingAfterDownPayment) > 0.01
    ) {
      throw new BadRequestException(
        `Installment calculation doesn't match: ${numberOfInstallments} × ${installmentAmount} = ${calculatedInstallmentTotal}, but should be ${remainingAfterDownPayment}`,
      );
    }
  }

  // FIXED: Proper SaleStatus type
  private calculateInitialStatus(
    downPayment: number,
    saleTotal: number,
  ): SaleStatus {
    if (downPayment === 0) return SaleStatus.UNPAID;
    if (downPayment >= saleTotal) return SaleStatus.FULLY_PAID;
    return SaleStatus.PARTIALLY_PAID;
  }

  private async calculateTotalPaid(
    saleId: string,
    prisma: any = this.prisma,
  ): Promise<Prisma.Decimal> {
    const result = await prisma.projectPayments.aggregate({
      where: { saleId },
      _sum: { amount: true },
    });
    return result._sum.amount || new Prisma.Decimal(0);
  }

  private async updateSaleStatus(
    saleId: string,
    totalPaid: Prisma.Decimal,
    saleTotal: number,
    prisma: any = this.prisma,
  ) {
    const totalPaidNum = parseFloat(totalPaid.toString());
    let status: SaleStatus;

    if (totalPaidNum >= saleTotal) {
      status = SaleStatus.FULLY_PAID;
    } else if (totalPaidNum > 0) {
      status = SaleStatus.PARTIALLY_PAID;
    } else {
      status = SaleStatus.UNPAID;
    }

    await prisma.projectSale.update({
      where: { id: saleId },
      data: { status },
    });
  }

  private async calculateNextInstallmentDue(sale: any) {
    const totalPaid = await this.calculateTotalPaid(sale.id);
    const totalPaidNum = parseFloat(totalPaid.toString());
    const downPaymentNum = parseFloat(sale.downPayment.toString());
    const installmentAmountNum = parseFloat(sale.installmentAmount.toString());

    const paymentsMade = Math.floor(
      (totalPaidNum - downPaymentNum) / installmentAmountNum,
    );

    if (paymentsMade >= sale.numberOfInstallments) {
      return null;
    }

    return this.calculateNextDueDate(sale.createdAt, paymentsMade);
  }

  private calculateNextDueDate(createdAt: Date, paymentsMade: number): Date {
    const dueDate = new Date(createdAt);
    dueDate.setMonth(dueDate.getMonth() + paymentsMade + 1);
    return dueDate;
  }

  private calculateExpectedCompletionDate(
    createdAt: Date,
    numberOfInstallments: number,
  ): Date {
    const completionDate = new Date(createdAt);
    completionDate.setMonth(completionDate.getMonth() + numberOfInstallments);
    return completionDate;
  }

  private getDateFilter(period?: 'day' | 'week' | 'month' | 'year') {
    if (!period) return undefined;

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return {
      createdAt: {
        gte: startDate,
        lte: now,
      },
    };
  }

  async uploadProjectSaleDeliveryNote(
    saleId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    const imagePath = `/uploads/project-delivery-notes/${file.filename}`;

    // ✅ Optional: delete old image
    const sale = await this.prisma.projectSales.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.deliveryNoteImage) {
      const filePath = join(process.cwd(), 'uploads/project-delivery-notes');
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn('Delivery note image deletion failed:', err);
      }
    }

    // ✅ Update database
    await this.prisma.projectSales.update({
      where: { id: saleId },
      data: { deliveryNoteImage: imagePath },
    });

    return {
      message: 'Delivery note image updated successfully',
      imageUrl: imagePath,
    };
  }
}

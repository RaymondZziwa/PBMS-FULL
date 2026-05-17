import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SaleStatus } from '@prisma/client';
import {
  CollectCreditPaymentDto,
  CreateSaleDto,
  UpdateSaleDto,
} from 'src/dto/pos.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { collectPayment } from 'src/utils/payments/collectPayment';

interface CollectionResponse {
  status: string;
  message: string;

  data: {
    transaction: {
      uuid: string;
      reference: string;
      status: string;
      provider_reference: string;
    };

    collection: {
      amount: {
        total?: number;
        currency?: string;
      };

      provider: string;
      phone_number: string;
      mode: string;
    };

    timeline: {
      initiated_at: string;
      estimated_settlement: string;
    };

    metadata: {
      response_timestamp: string;
      sandbox_mode: boolean;
    };
  };
}
@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
    const {
      customerId,
      servedBy,
      storeId,
      items,
      paymentMethods,
      notes,
      total,
      totalWithCharges,
      balance,
      status,
      phoneNumber,
    } = createSaleDto;

    return this.prisma.$transaction(async (tx) => {
      // If totalWithCharges is provided, process payment gateway first
      let paymentResult: CollectionResponse = {
        status: 'success',
        message: '',

        data: {
          transaction: {
            uuid: '',
            reference: '',
            status: 'processing',
            provider_reference: '',
          },

          collection: {
            amount: {
              total: 0,
              currency: '',
            },

            provider: '',
            phone_number: '',
            mode: '',
          },

          timeline: {
            initiated_at: '',
            estimated_settlement: '',
          },

          metadata: {
            response_timestamp: '',
            sandbox_mode: false,
          },
        },
      };
      let amountToProcess = total;

      if (totalWithCharges && totalWithCharges > total) {
        amountToProcess = totalWithCharges;
        paymentResult = await collectPayment(
          this.httpService,
          this.configService,
          {
            amount: amountToProcess,
            //method: 'Mobile_Money',
            country: 'UG',
            description: 'POS Sale Payment',
            phone_number: phoneNumber,
          },
        );

        console.log('result', paymentResult);

        // The initial request always returns success, real status comes from callback
        // We proceed with the sale and wait for callback to confirm payment status
        // Store the transaction reference for tracking
        const transactionReference = paymentResult.data.transaction.reference;
      }
      // 1️⃣ Fetch inventory matching itemId + unitId in this store
      const inventories = await tx.productInventory.findMany({
        where: {
          storeId,
          OR: items.map((item) => ({
            itemId: item.id,
            unitId: item.unitId,
          })),
        },
      });

      // Build lookup map: "itemId-unitId" → inventory
      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.itemId}-${inv.unitId}`, inv]),
      );

      // 2️⃣ Check stock availability
      for (const saleItem of items) {
        const key = `${saleItem.id}-${saleItem.unitId}`;
        const inventory = inventoryMap.get(key);

        if (!inventory || inventory.qty < saleItem.quantity) {
          throw new BadRequestException(
            `Insufficient stock for item "${saleItem.name}". Available: ${inventory?.qty ?? 0}, Required: ${saleItem.quantity}`,
          );
        }
      }

      // 3️⃣ Reduce inventory quantities
      for (const saleItem of items) {
        const key = `${saleItem.id}-${saleItem.unitId}`;
        const inventory = inventoryMap.get(key);

        if (!inventory) {
          throw new BadRequestException(
            `Inventory record not found for item "${saleItem.name}"`,
          );
        }

        await tx.productInventory.update({
          where: { id: inventory.id },
          data: {
            qty: inventory.qty - saleItem.quantity,
          },
        });
      }

      // 4️⃣ Create sale record
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

      // 5️⃣ Create payment records
      if (paymentMethods && paymentMethods.length > 0) {
        await Promise.all(
          paymentMethods.map((method) =>
            tx.salePayments.create({
              data: {
                saleId: sale.id,
                amount: method.amount,
                paymentMethod: method.type,
                referenceId: paymentResult
                  ? paymentResult.data.transaction.reference
                  : '',
                notes: paymentResult
                  ? `Transaction Ref: ${paymentResult.data.transaction.reference}`
                  : notes,
                cashierId: servedBy,
              },
            }),
          ),
        );
      }

      // 6️⃣ For async payments, wallet balance will be updated via callback
      // Don't update wallet here - wait for callback confirmation
      if (paymentResult) {
        console.log(
          `Payment initiated. Transaction Reference: ${paymentResult.data.transaction.reference}`,
        );
        console.log('Waiting for callback to confirm payment status...');
      }

      return {
        message: 'Sale created successfully',
        data: {
          ...sale,
          paymentInitiated: !!paymentResult,
          transactionReference: paymentResult
            ? paymentResult.data.transaction.reference
            : null,
          amountProcessed: amountToProcess,
          message: paymentResult
            ? `Payment initiated. Transaction Reference: ${paymentResult.data.transaction.reference}. Waiting for payment confirmation...`
            : 'No payment processing required',
        },
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

  async findCreditSales(id: number) {
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

  async findOne(id: number) {
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

  async update(id: number, updateSaleDto: UpdateSaleDto) {
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
            referenceId: dto.referenceId ? String(dto.referenceId) : null,
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

  async remove(id: number) {
    const existing = await this.prisma.sale.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Sale with ID ${id} not found`);

    await this.prisma.sale.delete({ where: { id } });

    return { message: 'Sale deleted successfully' };
  }

  private async processPaymentGatewaySimulation(
    amount: number,
    paymentType: string,
    metadata?: any,
  ): Promise<{ success: boolean; transactionId?: string; message: string }> {
    // TODO: Integrate with actual payment gateway (Stripe, PayPal, Mobile Money, etc.)
    // This is where you'll call the payment gateway API for POS sales

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Simulate payment success (90% success rate for demo)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        transactionId: `pos_sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: 'Payment processed successfully',
      };
    } else {
      return {
        success: false,
        message:
          'Payment gateway simulation failed - insufficient funds or declined',
      };
    }
  }
}

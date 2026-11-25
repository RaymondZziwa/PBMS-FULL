import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRecordCategory, PaymentType, StockTransferStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { CompanyService } from 'src/company-profile/profile.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PdfService, ReportConfig } from 'src/utils/pdfGenerator/generator.service';
import type { AuthenticatedUser } from 'src/auth/permissions';
import {
  assertStoreAccess,
  cents,
  cleanText,
  friendlyDbError,
  invalid,
  optionalId,
  requireText,
  toId,
  toNumber,
} from '../inventory.helpers';

const PERSON = { select: { id: true, firstName: true, lastName: true } } as const;

const SUPPLY_SELECT = {
  id: true,
  item: true,
  uom: true,
  proofImage: true,
  qty: true,
  value: true,
  balance: true,
  destinationStore: { select: { id: true, name: true } },
  employee: PERSON,
  paymentStatus: true,
  createdAt: true,
  SupplyPayments: {
    select: {
      id: true,
      paymentType: true,
      barterItemName: true,
      amount: true,
      bank: true,
      chequeNumber: true,
      chequeBankingDate: true,
      paidBy: true,
      createdAt: true,
      paymentStatus: true,
      proofImage: true,
      employee: PERSON,
    },
    orderBy: { createdAt: 'desc' },
  },
} as const;

const SUPPLIER_INCLUDE = { Supply: { select: SUPPLY_SELECT, orderBy: { createdAt: 'desc' } } } as const;

const statusFor = (balance: number, value: number): 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' =>
  balance <= 0 ? 'PAID' : balance < value ? 'PARTIALLY_PAID' : 'UNPAID';

const discard = async (file?: Express.Multer.File | null) => {
  if (file?.path) await unlink(file.path).catch(() => undefined);
};

@Injectable()
export class SupplierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly companyService: CompanyService,
  ) {}

  // ── Suppliers ────────────────────────────────────────────

  private async readSupplier(body: Record<string, unknown>, id?: number) {
    const firstName = requireText(body?.firstName, 'firstName', 'the first name', 80);
    const lastName = requireText(body?.lastName, 'lastName', 'the last name or company', 80);
    const contact = requireText(body?.contact, 'contact', 'a phone number', 30);
    const clash = await this.prisma.supplier.findFirst({ where: { contact, ...(id ? { NOT: { id } } : {}) }, select: { firstName: true, lastName: true } });
    if (clash) throw invalid('contact', `${clash.firstName} ${clash.lastName} already uses this phone number`);
    return { firstName, lastName, contact, address: cleanText(body?.address, 191) };
  }

  async create(body: Record<string, unknown>) {
    const supplier = await this.prisma.supplier
      .create({ data: await this.readSupplier(body), include: SUPPLIER_INCLUDE })
      .catch((e) => friendlyDbError(e, 'supplier'));
    return { data: supplier, message: `${supplier.firstName} ${supplier.lastName} added`, status: 201 };
  }

  async findAll() {
    const suppliers = await this.prisma.supplier.findMany({ orderBy: { createdAt: 'desc' }, include: SUPPLIER_INCLUDE });
    return { data: suppliers, message: 'Suppliers fetched successfully', status: 200 };
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id }, include: SUPPLIER_INCLUDE });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return { data: supplier, message: 'Supplier fetched successfully', status: 200 };
  }

  async update(id: number, body: Record<string, unknown>) {
    await this.findOne(id);
    const supplier = await this.prisma.supplier
      .update({ where: { id }, data: await this.readSupplier(body, id), include: SUPPLIER_INCLUDE })
      .catch((e) => friendlyDbError(e, 'supplier'));
    return { data: supplier, message: `${supplier.firstName} ${supplier.lastName} saved`, status: 200 };
  }

  /** Deleting a supplier would delete their supplies and payments (database cascade), so only suppliers without supplies can go. */
  async remove(id: number) {
    const s = await this.prisma.supplier.findUnique({ where: { id }, include: { _count: { select: { Supply: true } } } });
    if (!s) throw new NotFoundException('Supplier not found');
    if (s._count.Supply) throw new ConflictException(`${s.firstName} ${s.lastName} has ${s._count.Supply} supply record(s), so they can't be deleted`);
    await this.prisma.supplier.delete({ where: { id } });
    return { data: { id }, message: `${s.firstName} ${s.lastName} deleted`, status: 200 };
  }

  // ── Supplies ─────────────────────────────────────────────

  /**
   * Goods received from a supplier: the stock goes into the chosen store
   * straight away (a restock), and the value is owed to the supplier.
   */
  async createSupply(user: AuthenticatedUser, supplierIdRaw: unknown, file: Express.Multer.File | null, body: Record<string, unknown>) {
    try {
      const supplierId = toId(supplierIdRaw, 'supplierId', 'a supplier');
      const itemId = toId(body.itemId, 'itemId', 'an item');
      const unitId = toId(body.unitId, 'unitId', 'a unit');
      const storeId = toId(body.destinationStoreId, 'destinationStoreId', 'the store receiving the goods');
      const qty = toNumber(body.qty, 'qty', 'the quantity');
      const value = cents(toNumber(body.value, 'value', 'the value', true));
      const receivedBy = optionalId(body.recievedBy ?? body.receivedBy, 'recievedBy', 'who received the goods') ?? user.id;

      const [supplier, store, item, unit, receiver] = await Promise.all([
        this.prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, firstName: true, lastName: true } }),
        this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true, authorizedPersonnel: true } }),
        this.prisma.item.findUnique({ where: { id: itemId }, select: { id: true, name: true } }),
        this.prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } }),
        this.prisma.employee.findUnique({ where: { id: receivedBy }, select: { id: true } }),
      ]);
      if (!supplier) throw new NotFoundException('Supplier not found');
      if (!store) throw invalid('destinationStoreId', 'That store no longer exists');
      if (!item) throw invalid('itemId', 'That item no longer exists');
      if (!unit) throw invalid('unitId', 'That unit no longer exists');
      if (!receiver) throw invalid('recievedBy', 'That person no longer exists');
      assertStoreAccess(user, store);

      const proof = file ? `/uploads/supply-evidence/${file.filename}` : null;
      const supply = await this.prisma.$transaction(async (tx) => {
        const inv = await tx.productInventory.upsert({
          where: { itemId_storeId_unitId: { itemId, storeId, unitId } },
          create: { itemId, storeId, unitId, qty },
          update: { qty: { increment: qty } },
        });
        await tx.inventoryRecord.create({
          data: {
            itemId,
            storeId,
            unitId,
            category: InventoryRecordCategory.RESTOCK,
            qty,
            remainingQuantity: inv.qty,
            images: proof ? [proof] : [],
            source: 'SUPPLIER',
            description: `Supply from ${supplier.firstName} ${supplier.lastName}`,
            recordedBy: user.id,
            transferStatus: StockTransferStatus.CONFIRMED,
          },
        });
        return tx.supply.create({
          data: {
            supplierId,
            itemId,
            qty,
            unitId,
            value,
            balance: value,
            paymentStatus: value > 0 ? 'UNPAID' : 'PAID',
            recievedBy: receivedBy,
            destinationStoreId: storeId,
            proofImage: proof,
          },
          select: SUPPLY_SELECT,
        });
      });

      return { data: supply, message: `${qty} ${item.name} received into ${store.name}`, status: 201 };
    } catch (e) {
      await discard(file);
      throw e;
    }
  }

  /**
   * Change what was agreed (value), who received it, or the proof photo.
   * Quantities can't change here because the stock has already moved: record
   * a stock count or depletion in Stock Movement instead.
   */
  async modifySupply(idRaw: unknown, file: Express.Multer.File | null, body: Record<string, unknown>) {
    try {
      const id = toId(idRaw, 'id', 'a supply');
      const existing = await this.prisma.supply.findUnique({ where: { id }, include: { SupplyPayments: { select: { amount: true } } } });
      if (!existing) throw new NotFoundException('Supply not found');
      const paid = cents(existing.SupplyPayments.reduce((s, p) => s + Number(p.amount), 0));
      const value = body.value !== undefined && body.value !== '' ? cents(toNumber(body.value, 'value', 'the value', true)) : Number(existing.value);
      if (value < paid) throw invalid('value', `The value can't be less than what has already been paid (UGX ${paid.toLocaleString('en-US')})`);
      const receivedBy = optionalId(body.recievedBy ?? body.receivedBy, 'recievedBy', 'who received the goods') ?? existing.recievedBy;
      if (!(await this.prisma.employee.findUnique({ where: { id: receivedBy }, select: { id: true } }))) throw invalid('recievedBy', 'That person no longer exists');
      const balance = cents(value - paid);

      const supply = await this.prisma.supply.update({
        where: { id },
        data: {
          value,
          balance,
          paymentStatus: statusFor(balance, value),
          recievedBy: receivedBy,
          ...(file ? { proofImage: `/uploads/supply-evidence/${file.filename}` } : {}),
        },
        select: SUPPLY_SELECT,
      });
      return { data: supply, message: 'Supply updated', status: 200 };
    } catch (e) {
      await discard(file);
      throw e;
    }
  }

  /**
   * Remove a supply entered by mistake: its stock is taken back out of the
   * store. Not possible once payments exist, or if the stock has been used.
   */
  async deleteSupply(user: AuthenticatedUser, idRaw: unknown) {
    const id = toId(idRaw, 'id', 'a supply');
    const s = await this.prisma.supply.findUnique({
      where: { id },
      include: { _count: { select: { SupplyPayments: true } }, item: { select: { name: true } }, destinationStore: { select: { name: true, authorizedPersonnel: true } }, supplier: { select: { firstName: true, lastName: true } } },
    });
    if (!s) throw new NotFoundException('Supply not found');
    if (s._count.SupplyPayments) throw new ConflictException('This supply has payments. Delete the payments first.');
    assertStoreAccess(user, s.destinationStore);

    await this.prisma.$transaction(async (tx) => {
      const taken = await tx.productInventory.updateMany({
        where: { itemId: s.itemId, storeId: s.destinationStoreId, unitId: s.unitId, qty: { gte: s.qty } },
        data: { qty: { decrement: s.qty } },
      });
      if (!taken.count) throw new BadRequestException(`${s.destinationStore.name} no longer has ${s.qty} ${s.item.name} to take back, so this supply can't be deleted`);
      const left = await tx.productInventory.findUnique({ where: { itemId_storeId_unitId: { itemId: s.itemId, storeId: s.destinationStoreId, unitId: s.unitId } }, select: { qty: true } });
      await tx.inventoryRecord.create({
        data: {
          itemId: s.itemId,
          storeId: s.destinationStoreId,
          unitId: s.unitId,
          category: InventoryRecordCategory.DEPLETION,
          qty: s.qty,
          remainingQuantity: left?.qty ?? 0,
          images: [],
          source: 'SUPPLIER',
          description: `Supply from ${s.supplier.firstName} ${s.supplier.lastName} deleted`,
          recordedBy: user.id,
          transferStatus: StockTransferStatus.CONFIRMED,
        },
      });
      await tx.supply.delete({ where: { id } });
    });
    return { data: { id }, message: `Supply deleted and ${s.qty} ${s.item.name} taken back out of ${s.destinationStore.name}`, status: 200 };
  }

  // ── Payments ─────────────────────────────────────────────

  async processSupplierPayment(user: AuthenticatedUser, proofImage: Express.Multer.File | null, body: Record<string, unknown>) {
    try {
      const supplyId = toId(body.supplyId, 'supplyId', 'a supply');
      const amount = cents(toNumber(body.amount, 'amount', 'the amount'));
      const paymentType = String(body.paymentType ?? '') as PaymentType;
      if (!Object.values(PaymentType).includes(paymentType)) throw invalid('paymentType', 'Choose how it was paid');

      const extra: { bank?: string; chequeNumber?: string; chequeBankingDate?: Date; barterItemName?: string } = {};
      if (paymentType === 'CHEQUE') {
        extra.bank = requireText(body.bankName, 'bankName', 'the bank', 80);
        extra.chequeNumber = requireText(body.chequeNumber, 'chequeNumber', 'the cheque number', 40);
        const d = new Date(String(body.chequeBankingDate ?? ''));
        if (Number.isNaN(d.getTime())) throw invalid('chequeBankingDate', 'Choose the banking date');
        extra.chequeBankingDate = d;
      } else if (paymentType === 'BARTER_PAYMENT') {
        extra.barterItemName = requireText(body.barterItemName, 'barterItemName', 'what was given in exchange', 120);
      }

      const payment = await this.prisma.$transaction(async (tx) => {
        const supply = await tx.supply.findUnique({ where: { id: supplyId }, select: { id: true, value: true, balance: true } });
        if (!supply) throw new NotFoundException('Supply not found');
        const balance = cents(Number(supply.balance));
        if (amount > balance) throw invalid('amount', `That's more than the balance of UGX ${balance.toLocaleString('en-US')}`);
        const newBalance = cents(balance - amount);
        const status = statusFor(newBalance, Number(supply.value));
        // Guard against two people paying the same balance at once.
        const moved = await tx.supply.updateMany({ where: { id: supply.id, balance: supply.balance }, data: { balance: newBalance, paymentStatus: status } });
        if (!moved.count) throw new ConflictException('The balance has just changed. Refresh and try again.');
        return tx.supplyPayments.create({
          data: {
            supplyId,
            paymentType,
            amount,
            paidBy: user.id,
            paymentStatus: status,
            proofImage: proofImage ? `/uploads/supply-payment-evidence/${proofImage.filename}` : null,
            ...extra,
          },
          include: { employee: PERSON },
        });
      });

      return { data: payment, message: `Payment of UGX ${amount.toLocaleString('en-US')} recorded`, status: 201 };
    } catch (e) {
      await discard(proofImage);
      throw e;
    }
  }

  /** Undo a payment recorded by mistake; the amount goes back onto the balance. */
  async deletePayment(id: number) {
    const existing = await this.prisma.supplyPayments.findUnique({ where: { id }, include: { supply: true } });
    if (!existing) throw new NotFoundException('Payment not found');

    await this.prisma.$transaction(async (tx) => {
      const supply = existing.supply;
      const restored = cents(Number(supply.balance) + Number(existing.amount));
      await tx.supply.update({ where: { id: supply.id }, data: { balance: restored, paymentStatus: statusFor(restored, Number(supply.value)) } });
      await tx.supplyPayments.delete({ where: { id } });
    });
    return { data: { id }, message: 'Payment deleted and the balance restored', status: 200 };
  }

  // ── Reports ──────────────────────────────────────────────

  async getAllSuppliersReport() {
    // 1️⃣ Fetch all suppliers and include related supplies + payments
    const suppliers = await this.prisma.supplier.findMany({
      include: {
        Supply: {
          include: {
            item: true,
            uom: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            SupplyPayments: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2️⃣ If no suppliers exist
    if (!suppliers || suppliers.length === 0) {
      return {
        data: {
          suppliers: [],
          summary: {
            totalSuppliers: 0,
            overallTotalSupplied: 0,
            overallTotalPaid: 0,
            overallBalance: 0,
          },
        },
        message: 'No suppliers found in the system',
        status: 200,
      };
    }

    // 3️⃣ Transform suppliers with calculated totals
    const reportData = suppliers.map((supplier) => {
      const totalSupplied = supplier.Supply.reduce(
        (sum, s) => sum + Number(s.value),
        0,
      );

      const totalPaid = supplier.Supply.flatMap((s) => s.SupplyPayments).reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );

      const balance = totalSupplied - totalPaid;

      // 🧩 Optional: detailed breakdown for each supplier
      const supplyDetails = supplier.Supply.map((s) => ({
        id: s.id,
        itemName: s.item?.name,
        qty: s.qty,
        uom: s.uom?.name,
        value: Number(s.value),
        balance: Number(s.balance),
        paymentStatus: s.paymentStatus,
        receivedBy:
          `${s.employee?.firstName || ''} ${s.employee?.lastName || ''}`.trim(),
        createdAt: s.createdAt,
        payments: s.SupplyPayments.map((p) => ({
          id: p.id,
          paymentType: p.paymentType,
          amount: Number(p.amount),
          paymentStatus: p.paymentStatus,
          proofImage: p.proofImage,
          paidBy:
            `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`.trim(),
          createdAt: p.createdAt,
          bank: p.bank,
          chequeNumber: p.chequeNumber,
          chequeBankingDate: p.chequeBankingDate,
          barterItemName: p.barterItemName,
        })),
      }));

      return {
        supplierId: supplier.id,
        supplierName: `${supplier.firstName} ${supplier.lastName}`,
        contact: supplier.contact,
        address: supplier.address,
        totalSupplied,
        totalPaid,
        balance,
        supplies: supplyDetails,
      };
    });

    // 4️⃣ Compute overall totals
    const overallTotalSupplied = reportData.reduce(
      (sum, r) => sum + r.totalSupplied,
      0,
    );
    const overallTotalPaid = reportData.reduce(
      (sum, r) => sum + r.totalPaid,
      0,
    );
    const overallBalance = overallTotalSupplied - overallTotalPaid;

    // 5️⃣ Return final result
    return {
      data: {
        suppliers: reportData,
        summary: {
          totalSuppliers: reportData.length,
          overallTotalSupplied,
          overallTotalPaid,
          overallBalance,
        },
      },
      message: 'Supplier report generated successfully',
      status: 200,
    };
  }

  async exportSupplierPayment(id: number) {
    const payments = await this.prisma.supplyPayments.findMany({
      where: { supply: { supplierId: id } },
      include: { employee: true, supply: true },
      orderBy: { createdAt: 'desc' },
    });

    // You could use this result to generate a CSV or PDF export later
    return {
      data: payments,
      message: 'Supplier payments exported successfully',
      status: 200,
    };
  }
  async exportSuppliersReportPDF() {
    // Get report data using your existing method
    const reportResponse = await this.getAllSuppliersReport();
    const companyInfo = await this.companyService.getProfile();

    // Validate required data
    if (!companyInfo) {
      throw new NotFoundException('Company profile not found');
    }

    // Type guard to check if we have the expected data structure
    if (
      !reportResponse.data ||
      typeof reportResponse.data !== 'object' ||
      !('suppliers' in reportResponse.data) ||
      !reportResponse.data.suppliers ||
      reportResponse.data.suppliers.length === 0
    ) {
      throw new NotFoundException('No suppliers data found for export');
    }

    // Convert the data to match the expected types for PDF generation
    const rawData = reportResponse.data as any;

    // Transform the data to match the expected types
    const suppliers = rawData.suppliers.map((supplier: any) => ({
      ...supplier,
      address: supplier.address || '', // Convert null to empty string
      supplies: supplier.supplies.map((supply: any) => ({
        ...supply,
        createdAt:
          supply.createdAt instanceof Date
            ? supply.createdAt.toISOString()
            : String(supply.createdAt),
        payments: supply.payments.map((payment: any) => ({
          ...payment,
          createdAt:
            payment.createdAt instanceof Date
              ? payment.createdAt.toISOString()
              : String(payment.createdAt),
          chequeBankingDate:
            payment.chequeBankingDate instanceof Date
              ? payment.chequeBankingDate.toISOString()
              : payment.chequeBankingDate,
          barterItemName: payment.barterItemName || '', // Ensure barterItemName is never undefined
        })),
      })),
    }));

    const summary = rawData.summary;

    const config: ReportConfig = {
      title: 'Suppliers Summary Report',
      subtitle: 'Complete Supplier Financial Overview',
      filters: {
        'Generated Date': new Date().toLocaleDateString(),
        'Total Suppliers': summary.totalSuppliers.toString(),
      },
      summary: {
        cards: [
          {
            title: 'Total Suppliers',
            value: summary.totalSuppliers,
            subtitle: 'Active suppliers',
            color: [59, 130, 246], // Blue
          },
          {
            title: 'Total Supplied',
            value: `UGX ${summary.overallTotalSupplied.toLocaleString()}`,
            subtitle: 'Goods value',
            color: [34, 197, 94], // Green
          },
          {
            title: 'Total Paid',
            value: `UGX ${summary.overallTotalPaid.toLocaleString()}`,
            subtitle: 'Amount paid',
            color: [20, 184, 166], // Teal
          },
          {
            title: 'Balance Due',
            value: `UGX ${summary.overallBalance.toLocaleString()}`,
            subtitle: 'Outstanding',
            color: [239, 68, 68], // Red
          },
        ],
      },
      sections: [
        {
          title: 'Suppliers Summary',
          type: 'table' as const,
          data: suppliers,
          columns: [
            { header: 'Supplier Name', key: 'supplierName', width: 80 },
            { header: 'Contact', key: 'contact', width: 70 },
            { header: 'Address', key: 'address', width: 60 },
            {
              header: 'Total Supplied',
              key: 'totalSupplied',
              width: 100,
              format: (value: number) => ` ${Number(value).toLocaleString()}`,
            },
            {
              header: 'Total Paid',
              key: 'totalPaid',
              width: 80,
              format: (value: number) => `${Number(value).toLocaleString()}`,
            },
            {
              header: 'Balance',
              key: 'balance',
              width: 60,
              format: (value: number) => `${Number(value).toLocaleString()}`,
            },
            {
              header: 'Status',
              key: 'balance',
              width: 80,
              format: (value: number) =>
                Number(value) > 0 ? 'Has Balance' : 'Settled',
            },
          ],
        },
        // Detailed supplies section for each supplier
        ...suppliers.flatMap((supplier: any) => {
          const sections: any[] = [];

          // Add supply details section
          if (supplier.supplies.length > 0) {
            sections.push({
              title: `${supplier.supplierName} - Supply Details`,
              type: 'table' as const,
              data: supplier.supplies,
              columns: [
                { header: 'Item Name', key: 'itemName', width: 70 },
                {
                  header: 'Qty',
                  key: 'qty',
                  width: 40,
                  align: 'center' as const,
                },
                { header: 'Unit', key: 'uom', width: 80 },
                {
                  header: 'Value',
                  key: 'value',
                  width: 50,
                  format: (value: number) =>
                    `${Number(value).toLocaleString()}`,
                },
                {
                  header: 'Balance',
                  key: 'balance',
                  width: 50,
                  format: (value: number) =>
                    `${Number(value).toLocaleString()}`,
                },
                { header: 'Status', key: 'paymentStatus', width: 80 },
                {
                  header: 'Date',
                  key: 'createdAt',
                  width: 60,
                  format: (value: string) =>
                    new Date(value).toLocaleDateString(),
                },
              ],
            });
          }

          // Add payment sections for each supply
          supplier.supplies.forEach((supply: any) => {
            if (supply.payments.length > 0) {
              sections.push({
                title: `${supply.itemName} - Payments`,
                type: 'table' as const,
                data: supply.payments,
                columns: [
                  { header: 'Payment Type', key: 'paymentType', width: 80 },
                  {
                    header: 'Amount',
                    key: 'amount',
                    width: 45,
                    format: (value: number) =>
                      `${Number(value).toLocaleString()}`,
                  },
                  { header: 'Status', key: 'paymentStatus', width: 80 },
                  { header: 'Paid By', key: 'paidBy', width: 80 },
                  {
                    header: 'Date',
                    key: 'createdAt',
                    width: 80,
                    format: (value: string) =>
                      new Date(value).toLocaleDateString(),
                  },
                  {
                    header: 'Details',
                    key: 'paymentType',
                    width: 70,
                    format: (value: string, payment: any) => {
                      // Safe access to optional properties
                      if (
                        value === 'BARTER_PAYMENT' &&
                        payment?.barterItemName
                      ) {
                        return `Barter: ${payment.barterItemName}`;
                      }
                      if (value === 'CHEQUE' && payment?.chequeNumber) {
                        return `Cheque: ${payment.chequeNumber}`;
                      }
                      return '';
                    },
                  },
                ],
              });
            }
          });

          return sections;
        }),
      ],
      companyInfo,
    };

    const pdfBuffer = await this.pdfService.generateReportPDF(config);

    return {
      buffer: pdfBuffer,
      filename: `suppliers-report-${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryRecordCategory, StockTransferStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomInt } from 'crypto';
import { hasPermission, isFullAccess, PERMISSIONS, type AuthenticatedUser } from 'src/auth/permissions';
import {
  assertStoreAccess,
  canUseStore,
  cleanText,
  invalid,
  optionalId,
  toId,
  toNumber,
} from '../inventory.helpers';

type Line = { itemId: number; unitId: number; qty: number };

const CATEGORIES: InventoryRecordCategory[] = ['RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT'];

const LABEL: Record<string, string> = {
  RESTOCK: 'Restock',
  DEPLETION: 'Depletion',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Stock count',
};

const RECORD_INCLUDE = {
  item: { select: { id: true, name: true } },
  store: { select: { id: true, name: true } },
  toStore: { select: { id: true, name: true } },
  unit: { select: { id: true, name: true, abr: true } },
  employee: { select: { id: true, firstName: true, lastName: true } },
  deliveryNote: { select: { id: true, name: true, deliveryNoteNumber: true, images: true } },
} as const;

/** 8 letters/digits (no 0/O or 1/I); 32^8 combinations, so a clash is practically impossible. */
const transferCode = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');

const discard = async (files?: Express.Multer.File[]) => {
  await Promise.all((files ?? []).map((f) => unlink(f.path).catch(() => undefined)));
};

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record one movement for one or more items (restock, depletion, transfer or
   * stock count). Everything is checked first and saved together: either every
   * line is recorded or none is.
   *
   * Accepts `items` as a JSON list, or the older single-item fields
   * (itemId, unitId, qty) so existing screens keep working.
   */
  async create(user: AuthenticatedUser, files: Express.Multer.File[] | undefined, body: Record<string, unknown>) {
    try {
      const category = String(body.category ?? '').toUpperCase() as InventoryRecordCategory;
      if (!CATEGORIES.includes(category)) throw invalid('category', 'Choose the type of movement');
      if (category === 'ADJUSTMENT' && !isFullAccess(user) && !hasPermission(user, PERMISSIONS.STORES)) {
        throw new ForbiddenException('Only administrators and store managers can record a stock count');
      }

      const storeId = toId(body.storeId, 'storeId', 'a store');
      const toStoreId = category === 'TRANSFER' ? toId(body.toStoreId, 'toStoreId', 'the store receiving the stock') : null;
      if (toStoreId && toStoreId === storeId) throw invalid('toStoreId', 'Choose a different store to send the stock to');
      const deliveryNoteId = optionalId(body.deliveryNoteId, 'deliveryNoteId', 'a delivery note');
      const source = cleanText(body.source, 120) ?? (category === 'RESTOCK' ? 'Restock' : LABEL[category]);
      const description = cleanText(body.description, 1000);

      // Lines
      let raw: unknown = body.items;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          throw invalid('items', 'The item list could not be read. Please try again.');
        }
      }
      if (!Array.isArray(raw)) raw = body.itemId !== undefined ? [{ itemId: body.itemId, unitId: body.unitId, qty: body.qty }] : [];
      const list = raw as Array<Record<string, unknown>>;
      if (!list.length) throw invalid('items', 'Add at least one item');
      if (list.length > 200) throw invalid('items', 'Record at most 200 items at a time');
      const lines: Line[] = list.map((l, i) => ({
        itemId: toId(l.itemId, `items.${i}.itemId`, 'an item'),
        unitId: toId(l.unitId, `items.${i}.unitId`, 'a unit'),
        qty: toNumber(l.qty, `items.${i}.qty`, 'the quantity', category === 'ADJUSTMENT'),
      }));
      const seen = new Set<string>();
      for (const [i, l] of lines.entries()) {
        const key = `${l.itemId}:${l.unitId}`;
        if (seen.has(key)) throw invalid(`items.${i}.itemId`, 'The same item and unit appears twice. Combine them into one line.');
        seen.add(key);
      }

      // Stores, items, units, delivery note
      const [store, toStore, items, units, note] = await Promise.all([
        this.prisma.store.findUnique({ where: { id: storeId }, select: { id: true, name: true, authorizedPersonnel: true } }),
        toStoreId ? this.prisma.store.findUnique({ where: { id: toStoreId }, select: { id: true, name: true } }) : null,
        this.prisma.item.findMany({ where: { id: { in: lines.map((l) => l.itemId) } }, select: { id: true, name: true } }),
        this.prisma.unit.findMany({ where: { id: { in: lines.map((l) => l.unitId) } }, select: { id: true, name: true } }),
        deliveryNoteId ? this.prisma.deliveryNote.findUnique({ where: { id: deliveryNoteId }, select: { id: true } }) : null,
      ]);
      if (!store) throw invalid('storeId', 'That store no longer exists');
      if (toStoreId && !toStore) throw invalid('toStoreId', 'That store no longer exists');
      if (deliveryNoteId && !note) throw invalid('deliveryNoteId', 'That delivery note no longer exists');
      assertStoreAccess(user, store);
      const itemName = new Map(items.map((i) => [i.id, i.name]));
      const unitName = new Map(units.map((u) => [u.id, u.name]));
      lines.forEach((l, i) => {
        if (!itemName.has(l.itemId)) throw invalid(`items.${i}.itemId`, 'One of the items no longer exists. Refresh and try again.');
        if (!unitName.has(l.unitId)) throw invalid(`items.${i}.unitId`, 'One of the units no longer exists. Refresh and try again.');
      });

      const images = (files ?? []).map((f) => `/uploads/evidence/${f.filename}`);

      const records = await this.prisma.$transaction(async (tx) => {
        const saved: Array<{ id: number }> = [];
        for (const l of lines) {
          const key = { itemId_storeId_unitId: { itemId: l.itemId, storeId, unitId: l.unitId } };
          let remaining: number;

          if (category === 'RESTOCK') {
            const inv = await tx.productInventory.upsert({
              where: key,
              create: { itemId: l.itemId, storeId, unitId: l.unitId, qty: l.qty },
              update: { qty: { increment: l.qty } },
            });
            remaining = inv.qty;
          } else if (category === 'ADJUSTMENT') {
            const inv = await tx.productInventory.upsert({
              where: key,
              create: { itemId: l.itemId, storeId, unitId: l.unitId, qty: l.qty },
              update: { qty: l.qty },
            });
            remaining = inv.qty;
          } else {
            // DEPLETION and TRANSFER take stock out; only if there is enough (checked in the same statement).
            const taken = await tx.productInventory.updateMany({
              where: { itemId: l.itemId, storeId, unitId: l.unitId, qty: { gte: l.qty } },
              data: { qty: { decrement: l.qty } },
            });
            if (!taken.count) {
              const have = await tx.productInventory.findUnique({ where: key, select: { qty: true } });
              throw invalid(
                'items',
                `Not enough ${itemName.get(l.itemId)} in ${store.name}: ${have ? `${have.qty} ${unitName.get(l.unitId)} available` : `none recorded in ${unitName.get(l.unitId)}`}, ${l.qty} needed.`,
              );
            }
            remaining = (await tx.productInventory.findUnique({ where: key, select: { qty: true } }))?.qty ?? 0;
          }

          const rec = await tx.inventoryRecord.create({
            data: {
              category,
              itemId: l.itemId,
              storeId,
              toStoreId,
              unitId: l.unitId,
              deliveryNoteId,
              qty: l.qty,
              initiatedQty: category === 'TRANSFER' ? l.qty : null,
              remainingQuantity: remaining,
              images,
              source,
              description,
              recordedBy: user.id,
              ...(category === 'TRANSFER'
                ? { transferId: transferCode(), transferStatus: StockTransferStatus.PENDING }
                : { transferStatus: StockTransferStatus.CONFIRMED }),
            },
            select: { id: true },
          });
          saved.push(rec);
        }
        return saved;
      });

      const data = await this.prisma.inventoryRecord.findMany({ where: { id: { in: records.map((r) => r.id) } }, include: RECORD_INCLUDE, orderBy: { id: 'desc' } });
      const n = lines.length;
      const what = n === 1 ? itemName.get(lines[0].itemId) : `${n} items`;
      return {
        status: 201,
        data,
        message:
          category === 'TRANSFER'
            ? `Transfer of ${what} to ${toStore!.name} started. ${toStore!.name} confirms it when the stock arrives.`
            : `${LABEL[category]} of ${what} recorded in ${store.name}`,
      };
    } catch (e) {
      await discard(files);
      throw e;
    }
  }

  private async pendingTransfer(id: unknown) {
    const recordId = toId(id, 'transferId', 'a transfer');
    const rec = await this.prisma.inventoryRecord.findUnique({
      where: { id: recordId },
      include: {
        store: { select: { id: true, name: true, authorizedPersonnel: true } },
        toStore: { select: { id: true, name: true, authorizedPersonnel: true } },
        item: { select: { name: true } },
      },
    });
    if (!rec || rec.category !== 'TRANSFER' || !rec.toStoreId || !rec.toStore) throw new NotFoundException('Transfer not found');
    if (rec.transferStatus !== 'PENDING') throw invalid('transferId', `This transfer was already ${rec.transferStatus.toLowerCase()}`);
    return rec;
  }

  /** The receiving store confirms how much arrived. Less than sent is recorded as a mismatch to resolve. */
  async confirmStockTransfer(user: AuthenticatedUser, body: Record<string, unknown>) {
    const rec = await this.pendingTransfer(body.transferId);
    assertStoreAccess(user, rec.toStore!);
    const sent = rec.initiatedQty ?? rec.qty;
    const received = toNumber(body.confirmedQty, 'confirmedQty', 'the quantity received', true);
    if (received > sent) throw invalid('confirmedQty', `You can't receive more than was sent (${sent})`);
    const notes = cleanText(body.notes, 1000);
    if (received < sent && !notes) throw invalid('notes', 'Less arrived than was sent. Add a note explaining the difference.');

    await this.prisma.$transaction(async (tx) => {
      // Only one person can confirm it: the status check is part of the update.
      const claimed = await tx.inventoryRecord.updateMany({
        where: { id: rec.id, transferStatus: 'PENDING' },
        data: { qty: received, transferStatus: 'CONFIRMED', extraNote: notes, isResolved: received < sent ? false : null },
      });
      if (!claimed.count) throw invalid('transferId', 'Someone else has just handled this transfer. Refresh the page.');
      if (received > 0) {
        await tx.productInventory.upsert({
          where: { itemId_storeId_unitId: { itemId: rec.itemId, storeId: rec.toStoreId!, unitId: rec.unitId } },
          create: { itemId: rec.itemId, storeId: rec.toStoreId!, unitId: rec.unitId, qty: received },
          update: { qty: { increment: received } },
        });
      }
    });

    const data = await this.prisma.inventoryRecord.findUnique({ where: { id: rec.id }, include: RECORD_INCLUDE });
    return {
      status: 200,
      data,
      message: received < sent
        ? `Received ${received} of ${sent}. The difference is flagged as a mismatch to resolve.`
        : `Transfer received in ${rec.toStore!.name}`,
    };
  }

  /** Send the stock back: it returns to the store it came from. */
  async rejectStockTransfer(user: AuthenticatedUser, body: Record<string, unknown>) {
    const rec = await this.pendingTransfer(body.transferId);
    if (!canUseStore(user, rec.toStore!) && !canUseStore(user, rec.store)) assertStoreAccess(user, rec.toStore!);
    const reason = cleanText(body.reason, 1000);
    if (!reason) throw invalid('reason', 'Say why the transfer is rejected');
    const sent = rec.initiatedQty ?? rec.qty;

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryRecord.updateMany({
        where: { id: rec.id, transferStatus: 'PENDING' },
        data: { transferStatus: 'REJECTED', extraNote: reason },
      });
      if (!claimed.count) throw invalid('transferId', 'Someone else has just handled this transfer. Refresh the page.');
      await tx.productInventory.upsert({
        where: { itemId_storeId_unitId: { itemId: rec.itemId, storeId: rec.storeId, unitId: rec.unitId } },
        create: { itemId: rec.itemId, storeId: rec.storeId, unitId: rec.unitId, qty: sent },
        update: { qty: { increment: sent } },
      });
    });

    const data = await this.prisma.inventoryRecord.findUnique({ where: { id: rec.id }, include: RECORD_INCLUDE });
    return { status: 200, data, message: `Transfer rejected. ${sent} returned to ${rec.store.name}.` };
  }

  /** Close a quantity mismatch on a received transfer, with an explanation. */
  async resolveStockMvtConflict(user: AuthenticatedUser, id: number, notesRaw: unknown) {
    const rec = await this.prisma.inventoryRecord.findUnique({
      where: { id },
      include: { store: { select: { name: true, authorizedPersonnel: true } }, toStore: { select: { name: true, authorizedPersonnel: true } } },
    });
    if (!rec || rec.category !== 'TRANSFER') throw new NotFoundException('Transfer not found');
    if (rec.transferStatus !== 'CONFIRMED' || rec.initiatedQty === null || rec.qty === rec.initiatedQty) {
      throw invalid('id', 'This transfer has no mismatch to resolve');
    }
    if (rec.isResolved) throw invalid('id', 'This mismatch is already resolved');
    if (!canUseStore(user, rec.store) && !(rec.toStore && canUseStore(user, rec.toStore))) assertStoreAccess(user, rec.store);
    const notes = cleanText(notesRaw, 1000);
    if (!notes) throw invalid('notes', 'Explain how the mismatch was resolved');

    const data = await this.prisma.inventoryRecord.update({
      where: { id },
      data: { isResolved: true, resolveNotes: notes },
      include: RECORD_INCLUDE,
    });
    return { status: 200, data, message: 'Mismatch marked as resolved' };
  }

  async getAllStockMovementRecords() {
    const records = await this.prisma.inventoryRecord.findMany({
      include: RECORD_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    return { status: 200, message: 'Stock movement records fetched successfully', data: records };
  }
}

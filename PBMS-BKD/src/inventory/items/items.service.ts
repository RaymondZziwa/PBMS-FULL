import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { generateEAN13 } from 'src/utils/barcodeGenerator';
import { GenericResponse } from 'src/utils/genericResponse';
import { friendlyDbError, invalid, optionalId, requireText, toBool, toNumber } from '../inventory.helpers';

const INCLUDE = {
  category: true,
  _count: { select: { ProductInventory: true, InventoryRecord: true, Supply: true, ExhibitionInventory: true, ExhibitionInventoryRecords: true } },
} as const;

@Injectable()
export class ItemService {
  constructor(private readonly prismaService: PrismaService) {}

  private async read(body: Record<string, unknown>, id?: number) {
    const name = requireText(body.name, 'name', 'the item name', 120);
    const price = toNumber(body.price, 'price', 'the price', true);
    const categoryId = optionalId(body.categoryId, 'categoryId', 'a category');
    if (categoryId && !(await this.prismaService.itemCategory.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
      throw invalid('categoryId', 'That category no longer exists');
    }
    const clash = await this.prismaService.item.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (clash) throw invalid('name', `There is already an item called ${name}`);
    return { name, price, categoryId, showInPos: toBool(body.showInPos) };
  }

  async create(body: Record<string, unknown>): Promise<GenericResponse> {
    const data = await this.read(body);
    let barcode = generateEAN13();
    for (let i = 0; i < 5 && (await this.prismaService.item.findFirst({ where: { barcode }, select: { id: true } })); i++) barcode = generateEAN13();
    const item = await this.prismaService.item.create({ data: { ...data, barcode }, include: INCLUDE }).catch((e) => friendlyDbError(e, 'item'));
    return { status: 201, data: item, message: `${item.name} added` };
  }

  async findAll(): Promise<GenericResponse> {
    const items = await this.prismaService.item.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
    return { status: 200, data: items, message: 'Items fetched successfully' };
  }

  async findAllWithStoreQuantity(storeId: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.findUnique({ where: { id: storeId }, select: { id: true } });
    if (!store) throw new NotFoundException('Store not found');
    const items = await this.prismaService.productInventory.findMany({
      where: { storeId },
      include: { item: { include: { category: true } }, store: true, unit: true },
      orderBy: { item: { name: 'asc' } },
    });
    return { status: 200, data: items, message: 'Selected store inventory fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const item = await this.prismaService.item.findUnique({ where: { id }, include: INCLUDE });
    if (!item) throw new NotFoundException('Item not found');
    return { status: 200, data: item, message: 'Item fetched successfully' };
  }

  async update(id: number, body: Record<string, unknown>): Promise<GenericResponse> {
    if (!(await this.prismaService.item.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Item not found');
    const data = await this.read(body, id);
    const item = await this.prismaService.item.update({ where: { id }, data, include: INCLUDE }).catch((e) => friendlyDbError(e, 'item'));
    return { status: 200, data: item, message: `${item.name} saved` };
  }

  /** Deleting an item would wipe its stock and history (database cascade), so items in use can't be deleted. */
  async remove(id: number): Promise<GenericResponse> {
    const item = await this.prismaService.item.findUnique({ where: { id }, include: INCLUDE });
    if (!item) throw new NotFoundException('Item not found');
    const c = item._count;
    const used = c.ProductInventory + c.InventoryRecord + c.Supply + c.ExhibitionInventory + c.ExhibitionInventoryRecords;
    if (used) throw new ConflictException(`${item.name} has stock or stock history, so it can't be deleted. Hide it from the POS instead.`);
    await this.prismaService.item.delete({ where: { id } });
    return { status: 200, data: { id }, message: `${item.name} deleted` };
  }
}

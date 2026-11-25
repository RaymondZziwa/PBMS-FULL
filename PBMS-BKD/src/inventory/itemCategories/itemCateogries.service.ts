import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { friendlyDbError, invalid, requireText } from '../inventory.helpers';

const INCLUDE = { _count: { select: { Item: true } } } as const;

@Injectable()
export class ItemCategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  private async readName(body: Record<string, unknown>, id?: number) {
    const name = requireText(body?.name, 'name', 'the category name', 120);
    const clash = await this.prismaService.itemCategory.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (clash) throw invalid('name', `There is already a category called ${name}`);
    return name;
  }

  async create(body: Record<string, unknown>): Promise<GenericResponse> {
    const name = await this.readName(body);
    const data = await this.prismaService.itemCategory.create({ data: { name }, include: INCLUDE }).catch((e) => friendlyDbError(e, 'category'));
    return { status: 201, data, message: `Category ${name} added` };
  }

  async findAll(): Promise<GenericResponse> {
    const data = await this.prismaService.itemCategory.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
    return { status: 200, data, message: 'Item categories fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const data = await this.prismaService.itemCategory.findUnique({ where: { id }, include: INCLUDE });
    if (!data) throw new NotFoundException('Category not found');
    return { status: 200, data, message: 'Item category fetched successfully' };
  }

  async update(id: number, body: Record<string, unknown>): Promise<GenericResponse> {
    if (!(await this.prismaService.itemCategory.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Category not found');
    const name = await this.readName(body, id);
    const data = await this.prismaService.itemCategory.update({ where: { id }, data: { name }, include: INCLUDE }).catch((e) => friendlyDbError(e, 'category'));
    return { status: 200, data, message: `Category ${name} saved` };
  }

  /** Deleting a category would delete its items too (database cascade), so it must be empty first. */
  async remove(id: number): Promise<GenericResponse> {
    const cat = await this.prismaService.itemCategory.findUnique({ where: { id }, include: INCLUDE });
    if (!cat) throw new NotFoundException('Category not found');
    if (cat._count.Item) throw new ConflictException(`${cat.name} has ${cat._count.Item} item(s). Move them to another category first.`);
    await this.prismaService.itemCategory.delete({ where: { id } });
    return { status: 200, data: { id }, message: `Category ${cat.name} deleted` };
  }
}

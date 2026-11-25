import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { friendlyDbError, invalid, requireText, toId } from '../inventory.helpers';

const INCLUDE = {
  branch: true,
  dept: true,
  _count: { select: { ProductInventory: true, fromInventoryRecords: true, toInventoryRecords: true, Sales: true, Supply: true, Manufacturing: true } },
} as const;

@Injectable()
export class StoreService {
  constructor(private readonly prismaService: PrismaService) {}

  private async read(body: Record<string, unknown>, id?: number) {
    const name = requireText(body?.name, 'name', 'the store name', 120);
    const branchId = toId(body?.branchId, 'branchId', 'a branch');
    const deptId = toId(body?.deptId, 'deptId', 'a department');
    const raw = Array.isArray(body?.authorizedPersonnel) ? body.authorizedPersonnel : [];
    const people = [...new Set(raw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))];

    const [branch, dept, found, clash] = await Promise.all([
      this.prismaService.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
      this.prismaService.department.findUnique({ where: { id: deptId }, select: { id: true } }),
      people.length ? this.prismaService.employee.count({ where: { id: { in: people } } }) : 0,
      this.prismaService.store.findFirst({ where: { name, branchId, ...(id ? { NOT: { id } } : {}) }, select: { id: true } }),
    ]);
    if (!branch) throw invalid('branchId', 'That branch no longer exists');
    if (!dept) throw invalid('deptId', 'That department no longer exists');
    if (found !== people.length) throw invalid('authorizedPersonnel', 'Some of the chosen people no longer exist. Refresh and try again.');
    if (clash) throw invalid('name', `This branch already has a store called ${name}`);
    return { name, branchId, deptId, authorizedPersonnel: people };
  }

  async create(body: Record<string, unknown>): Promise<GenericResponse> {
    const data = await this.prismaService.store.create({ data: await this.read(body), include: INCLUDE }).catch((e) => friendlyDbError(e, 'store'));
    return { status: 201, data, message: `${data.name} added` };
  }

  async findAll(): Promise<GenericResponse> {
    const stores = await this.prismaService.store.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
    return { status: 200, data: stores, message: 'Stores fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.findUnique({ where: { id }, include: INCLUDE });
    if (!store) throw new NotFoundException('Store not found');
    return { status: 200, data: store, message: 'Store fetched successfully' };
  }

  async update(id: number, body: Record<string, unknown>): Promise<GenericResponse> {
    if (!(await this.prismaService.store.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Store not found');
    const data = await this.prismaService.store.update({ where: { id }, data: await this.read(body, id), include: INCLUDE }).catch((e) => friendlyDbError(e, 'store'));
    return { status: 200, data, message: `${data.name} saved` };
  }

  /** Deleting a store would delete its stock, sales and history (database cascade), so only unused stores can go. */
  async remove(id: number): Promise<GenericResponse> {
    const store = await this.prismaService.store.findUnique({ where: { id }, include: INCLUDE });
    if (!store) throw new NotFoundException('Store not found');
    if ((Object.values(store._count) as number[]).some((n) => n > 0)) {
      throw new ConflictException(`${store.name} has stock, sales or history, so it can't be deleted`);
    }
    await this.prismaService.store.delete({ where: { id } });
    return { status: 200, data: { id }, message: `${store.name} deleted` };
  }
}

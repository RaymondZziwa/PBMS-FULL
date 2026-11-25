import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { cleanText, friendlyDbError, invalid, requireText } from '../inventory.helpers';

const INCLUDE = {
  _count: { select: { ProductInventory: true, InventoryRecord: true, Supply: true, ExhibitionInventory: true, ExhibitionInventoryRecord: true, primaryUnitManufacturings: true, packingUnitManufacturings: true } },
} as const;

@Injectable()
export class MeasurementUnitService {
  constructor(private readonly prismaService: PrismaService) {}

  private async read(body: Record<string, unknown>, id?: number) {
    const name = requireText(body?.name, 'name', 'the unit name', 60);
    const clash = await this.prismaService.unit.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (clash) throw invalid('name', `There is already a unit called ${name}`);
    return { name, abr: cleanText(body?.abr, 12) };
  }

  async create(body: Record<string, unknown>): Promise<GenericResponse> {
    const data = await this.prismaService.unit.create({ data: await this.read(body), include: INCLUDE }).catch((e) => friendlyDbError(e, 'unit'));
    return { status: 201, data, message: `Unit ${data.name} added` };
  }

  async findAll(): Promise<GenericResponse> {
    const data = await this.prismaService.unit.findMany({ include: INCLUDE, orderBy: { name: 'asc' } });
    return { status: 200, data, message: 'Units fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const data = await this.prismaService.unit.findUnique({ where: { id }, include: INCLUDE });
    if (!data) throw new NotFoundException('Unit not found');
    return { status: 200, data, message: 'Unit fetched successfully' };
  }

  async update(id: number, body: Record<string, unknown>): Promise<GenericResponse> {
    if (!(await this.prismaService.unit.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Unit not found');
    const data = await this.prismaService.unit.update({ where: { id }, data: await this.read(body, id), include: INCLUDE }).catch((e) => friendlyDbError(e, 'unit'));
    return { status: 200, data, message: `Unit ${data.name} saved` };
  }

  /** A unit in use would take stock and history with it (database cascade), so it can't be deleted. */
  async remove(id: number): Promise<GenericResponse> {
    const unit = await this.prismaService.unit.findUnique({ where: { id }, include: INCLUDE });
    if (!unit) throw new NotFoundException('Unit not found');
    if ((Object.values(unit._count) as number[]).some((n) => n > 0)) throw new ConflictException(`${unit.name} is used by stock records, so it can't be deleted`);
    await this.prismaService.unit.delete({ where: { id } });
    return { status: 200, data: { id }, message: `Unit ${unit.name} deleted` };
  }
}

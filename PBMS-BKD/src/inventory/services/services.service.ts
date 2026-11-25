import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { friendlyDbError, invalid, requireText, toNumber } from '../inventory.helpers';

@Injectable()
export class MservicesService {
  constructor(private readonly prismaService: PrismaService) {}

  private async read(body: Record<string, unknown>, id?: number) {
    const name = requireText(body?.name, 'name', 'the service name', 120);
    const price = toNumber(body?.price, 'price', 'the price', true);
    const clash = await this.prismaService.service.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (clash) throw invalid('name', `There is already a service called ${name}`);
    return { name, price };
  }

  async create(body: Record<string, unknown>): Promise<GenericResponse> {
    const data = await this.prismaService.service.create({ data: await this.read(body) }).catch((e) => friendlyDbError(e, 'service'));
    return { status: 201, data, message: `${data.name} added` };
  }

  async findAll(): Promise<GenericResponse> {
    const data = await this.prismaService.service.findMany({ orderBy: { name: 'asc' } });
    return { status: 200, data, message: 'Services fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const data = await this.prismaService.service.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Service not found');
    return { status: 200, data, message: 'Service fetched successfully' };
  }

  async update(id: number, body: Record<string, unknown>): Promise<GenericResponse> {
    if (!(await this.prismaService.service.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Service not found');
    const data = await this.prismaService.service.update({ where: { id }, data: await this.read(body, id) }).catch((e) => friendlyDbError(e, 'service'));
    return { status: 200, data, message: `${data.name} saved` };
  }

  async remove(id: number): Promise<GenericResponse> {
    const s = await this.prismaService.service.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Service not found');
    await this.prismaService.service.delete({ where: { id } });
    return { status: 200, data: { id }, message: `${s.name} deleted` };
  }
}

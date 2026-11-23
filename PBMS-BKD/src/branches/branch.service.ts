import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class BranchService {
  constructor(private readonly prismaService: PrismaService) {}

  /** Trims and checks name/location; refuses a second branch with the same name. */
  private async clean(data: { name?: unknown; location?: unknown }, id?: number, partial = false) {
    const out: { name?: string; location?: string } = {};
    for (const key of ['name', 'location'] as const) {
      const v = data[key];
      if (v === undefined && partial) continue;
      const t = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
      if (!t) throw new BadRequestException(`Enter the branch ${key}`);
      if (t.length > 120) throw new BadRequestException(`The branch ${key} is too long`);
      out[key] = t;
    }
    if (out.name) {
      const same = await this.prismaService.branch.findFirst({
        where: { name: out.name, ...(id ? { NOT: { id } } : {}) },
        select: { id: true },
      });
      if (same) throw new ConflictException(`There's already a branch called "${out.name}"`);
    }
    return out;
  }

  async create(data: { name?: unknown; location?: unknown }): Promise<GenericResponse> {
    const clean = (await this.clean(data)) as { name: string; location: string };
    const branch = await this.prismaService.branch.create({ data: clean, include: { _count: { select: { Employee: true, Store: true, Department: true } } } });
    return { status: 200, data: branch, message: 'Branch added' };
  }

  /** Branches with how many people, stores and departments each has. */
  async findAll(): Promise<GenericResponse> {
    const branches = await this.prismaService.branch.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { Employee: true, Store: true, Department: true } } },
    });
    return { status: 200, data: branches, message: 'Branches fetched successfully' };
  }

  async findOne(id: number): Promise<GenericResponse> {
    const branch = await this.prismaService.branch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return { status: 200, data: branch, message: 'Branch fetched successfully' };
  }

  async update(id: number, data: { name?: unknown; location?: unknown }): Promise<GenericResponse> {
    const exists = await this.prismaService.branch.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Branch not found');
    const clean = await this.clean(data, id, true);
    const branch = await this.prismaService.branch.update({
      where: { id },
      data: clean,
      include: { _count: { select: { Employee: true, Store: true, Department: true } } },
    });
    return { status: 200, data: branch, message: 'Branch saved' };
  }

  async remove(id: number): Promise<GenericResponse> {
    // Employees, departments, stores and expenses are linked to branches with
    // ON DELETE CASCADE, so deleting a branch in use would delete all of them.
    const used = await this.prismaService.branch.findUnique({
      where: { id },
      select: { _count: { select: { Employee: true, Department: true, Store: true, branchExpense: true } } },
    });
    if (!used) throw new NotFoundException('Branch not found');
    const c = used._count;
    if (c.Employee + c.Department + c.Store + c.branchExpense > 0) {
      throw new ConflictException(
        `This branch still has ${c.Employee} employee(s), ${c.Department} department(s), ${c.Store} store(s) and ${c.branchExpense} expense(s). Move or remove them first.`,
      );
    }
    const branch = await this.prismaService.branch.delete({ where: { id } });
    return {
      status: 200,
      data: branch,
      message: 'Branch deleted',
    };
  }
}

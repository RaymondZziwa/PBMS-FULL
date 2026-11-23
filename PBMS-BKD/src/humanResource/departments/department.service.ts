import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from 'src/dto/humanResource.dto';
import { PrismaService } from 'src/prisma/prisma.service';

/** Counts instead of every employee (with passwords) and store in each department. */
const DEPARTMENT_SELECT = {
  id: true,
  name: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, location: true } },
  _count: { select: { Employee: true, Store: true } },
} satisfies Prisma.DepartmentSelect;

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  private friendly(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') throw new NotFoundException('Department not found');
      if (error.code === 'P2003') {
        throw new ConflictException('This department still has records linked to it.');
      }
    }
    throw error;
  }

  async create(dto: CreateDepartmentDto) {
    const created = await this.prisma.department.create({
      data: { name: dto.name.trim(), branchId: Number(dto.branchId) },
      select: DEPARTMENT_SELECT,
    });
    return { status: 201, data: created, message: 'Department saved successfully' };
  }

  async findAll() {
    const depts = await this.prisma.department.findMany({
      select: DEPARTMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return { status: 200, data: depts, message: 'Departments fetched successfully' };
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: DEPARTMENT_SELECT,
    });
    if (!department) throw new NotFoundException(`Department with id ${id} not found`);
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    try {
      const updated = await this.prisma.department.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.branchId !== undefined && { branchId: Number(dto.branchId) }),
        },
        select: DEPARTMENT_SELECT,
      });
      return { status: 200, data: updated, message: 'Department updated successfully' };
    } catch (error) {
      this.friendly(error);
    }
  }

  async remove(id: number) {
    // People and stores are linked with ON DELETE CASCADE in the schema, so deleting a
    // department that still has them would silently delete those employees too.
    const counts = await this.prisma.department.findUnique({
      where: { id },
      select: { _count: { select: { Employee: true, Store: true } } },
    });
    if (!counts) throw new NotFoundException('Department not found');
    const { Employee, Store } = counts._count;
    if (Employee > 0 || Store > 0) {
      throw new ConflictException(
        `Move its ${Employee} employee(s) and ${Store} store(s) to another department first.`,
      );
    }
    try {
      await this.prisma.department.delete({ where: { id } });
    } catch (error) {
      this.friendly(error);
    }
    return { status: 200, data: { id }, message: 'Department deleted' };
  }
}

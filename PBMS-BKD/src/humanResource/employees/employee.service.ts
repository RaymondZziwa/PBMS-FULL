import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateEmployeeDto,
  employeeProfileUpdateDto,
  saveEmployeeSystemSettingsDto,
  UpdateEmployeeDto,
} from 'src/dto/humanResource.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Gender, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { basename, join } from 'path';
import { unlink } from 'fs/promises';
import {
  isFullAccess,
  isFullAccessRole,
  type AuthenticatedUser,
} from 'src/auth/permissions';
import { userCache } from 'src/auth/userCache';

/**
 * What the employee list returns. Never the password hash, and not the whole
 * attendance history (that made the list slow and grew forever).
 */
const EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  gender: true,
  email: true,
  tel: true,
  salary: true,
  hasAccess: true,
  hasPrescriptionAccess: true,
  isActive: true,
  profileImage: true,
  roleId: true,
  branchId: true,
  deptId: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  dept: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeSelect;

type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof EMPLOYEE_SELECT }>;

/** Reads the password column only to say whether one is set; the hash never leaves. */
const SELECT_WITH_LOGIN = { ...EMPLOYEE_SELECT, password: true } satisfies Prisma.EmployeeSelect;
type EmployeeWithLogin = Prisma.EmployeeGetPayload<{ select: typeof SELECT_WITH_LOGIN }>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Blank email becomes null (people who don't sign in may have none). */
const cleanEmail = (email?: string | null) => {
  const v = (email ?? '').trim().toLowerCase();
  if (!v) return null;
  if (!EMAIL.test(v)) throw new BadRequestException("That email address doesn't look right");
  return v;
};

const UPDATABLE_FIELDS = [
  'firstName',
  'lastName',
  'gender',
  'email',
  'tel',
  'salary',
  'hasAccess',
  'hasPrescriptionAccess',
  'isActive',
  'profileImage',
  'roleId',
  'branchId',
  'deptId',
] as const;

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly saltRounds = 12;

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.saltRounds);
    return bcrypt.hash(password, salt);
  }

  /** Salary is HR data: blank it for people who may only see the list (e.g. attendance). */
  private shape(row: EmployeeWithLogin, showSalary = true) {
    const { password, ...rest } = row;
    const out: EmployeeRow & { hasPassword: boolean } = { ...rest, hasPassword: !!password };
    return showSalary ? out : { ...out, salary: null };
  }

  /** Only full-access users may hand out a full-access (admin) role. */
  private async assertCanAssignRole(roleId: number | undefined, actor?: AuthenticatedUser) {
    if (roleId === undefined || roleId === null) return;
    const role = await this.prisma.role.findUnique({
      where: { id: Number(roleId) },
      select: { name: true, permissions: { select: { value: true } } },
    });
    if (!role) throw new BadRequestException('That role does not exist');
    if (isFullAccessRole(role) && !isFullAccess(actor)) {
      throw new ForbiddenException('Only an administrator can give someone an administrator role');
    }
  }

  /** Turn database errors into messages people can act on. */
  private friendly(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = String((error.meta?.target as string[] | string | undefined) ?? '');
        if (target.includes('email')) throw new ConflictException('Another employee already uses this email');
        if (target.includes('tel')) throw new ConflictException('Another employee already uses this phone number');
        throw new ConflictException('An employee with these details already exists');
      }
      if (error.code === 'P2003') {
        throw new ConflictException(
          'This employee has records in the system (sales, stock, payments...). Disable their account instead of deleting it.',
        );
      }
      if (error.code === 'P2025') throw new NotFoundException('Employee not found');
    }
    throw error;
  }

  async create(dto: CreateEmployeeDto, actor?: AuthenticatedUser) {
    const email = cleanEmail(dto.email);
    const signsIn = dto.hasAccess === true;
    // Email and password are only needed for people who will use the system.
    if (signsIn && !email) throw new BadRequestException('Add an email so they can sign in');
    if (signsIn && (!dto.password || dto.password.length < 8)) {
      throw new BadRequestException('Set a password of at least 8 characters so they can sign in');
    }
    if (dto.password && dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    await this.assertCanAssignRole(dto.roleId, actor);
    try {
      const created = await this.prisma.employee.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          gender: dto.gender as Gender,
          email,
          tel: dto.tel.trim(),
          password: dto.password ? await this.hashPassword(dto.password) : null,
          salary: dto.salary,
          hasAccess: dto.hasAccess ?? false,
          hasPrescriptionAccess: dto.hasPrescriptionAccess ?? false,
          isActive: dto.isActive ?? true,
          profileImage: dto.profileImage,
          roleId: Number(dto.roleId),
          branchId: dto.branchId ? Number(dto.branchId) : null,
          deptId: dto.deptId ? Number(dto.deptId) : null,
        },
        select: SELECT_WITH_LOGIN,
      });
      return { status: 201, data: this.shape(created), message: 'Employee has been saved successfully' };
    } catch (error) {
      this.friendly(error);
    }
  }

  async findAll(showSalary = true) {
    const emps = await this.prisma.employee.findMany({
      select: SELECT_WITH_LOGIN,
      orderBy: { createdAt: 'desc' },
    });
    return {
      status: 200,
      data: emps.map((e) => this.shape(e, showSalary)),
      message: 'Employees fetched successfully',
    };
  }

  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: SELECT_WITH_LOGIN,
    });
    if (!employee) throw new NotFoundException(`Employee with id ${id} not found`);
    return this.shape(employee);
  }

  async update(id: number, dto: UpdateEmployeeDto, actor?: AuthenticatedUser) {
    const data: Prisma.EmployeeUncheckedUpdateInput = {};
    for (const key of UPDATABLE_FIELDS) {
      if (dto[key] !== undefined) (data as Record<string, unknown>)[key] = dto[key];
    }
    if (dto.email !== undefined) data.email = cleanEmail(dto.email);
    if (data.roleId !== undefined) data.roleId = Number(data.roleId);
    if (data.branchId !== undefined) data.branchId = data.branchId ? Number(data.branchId) : null;
    if (data.deptId !== undefined) data.deptId = data.deptId ? Number(data.deptId) : null;

    // The old code saved a new password exactly as typed (unhashed).
    if (dto.password) {
      if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
      data.password = await this.hashPassword(dto.password);
    }
    if (dto.roleId !== undefined) await this.assertCanAssignRole(dto.roleId, actor);

    // Turning on sign-in (or keeping it on) needs an email and a password on file.
    const current = await this.prisma.employee.findUnique({
      where: { id },
      select: { hasAccess: true, email: true, password: true },
    });
    if (!current) throw new NotFoundException('Employee not found');
    const willSignIn = dto.hasAccess ?? current.hasAccess;
    if (willSignIn) {
      const email = data.email !== undefined ? data.email : current.email;
      if (!email) throw new BadRequestException('Add an email so they can sign in');
      if (!dto.password && !current.password) {
        throw new BadRequestException('Set a password so they can sign in');
      }
    }

    try {
      const updated = await this.prisma.employee.update({
        where: { id },
        data,
        select: SELECT_WITH_LOGIN,
      });
      userCache.invalidate(id);
      return { status: 200, data: this.shape(updated), message: 'Employee updated successfully' };
    } catch (error) {
      this.friendly(error);
    }
  }

  async remove(id: number, actor?: AuthenticatedUser) {
    if (actor?.id === id) throw new BadRequestException("You can't delete your own account");
    try {
      await this.prisma.employee.delete({ where: { id } });
      userCache.invalidate(id);
      return { status: 200, data: { id }, message: 'Employee deleted' };
    } catch (error) {
      this.friendly(error);
    }
  }

  async updateProfileImage(employeeId: number, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { profileImage: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    if (employee.profileImage) {
      // Stored as "/uploads/images/<file>"; only ever delete inside that folder.
      const filePath = join(process.cwd(), 'uploads/images', basename(employee.profileImage));
      try {
        await unlink(filePath);
      } catch {
        // already gone
      }
    }

    const imagePath = `/uploads/images/${file.filename}`;
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { profileImage: imagePath },
    });
    userCache.invalidate(employeeId);
    return { message: 'Profile image updated successfully', imageUrl: imagePath };
  }

  async exportEmployeeData(id: number) {
    return this.findOne(id);
  }

  async employeeProfileUpdate(id: number, dto: employeeProfileUpdateDto) {
    const employee = await this.findOne(id);
    const data: Prisma.EmployeeUncheckedUpdateInput = {
      email: cleanEmail(dto.email) ?? employee.email,
      tel: dto.tel ?? employee.tel,
    };
    if (dto.password) {
      if (dto.password.length < 8) throw new BadRequestException('Password must be at least 8 characters');
      data.password = await this.hashPassword(dto.password);
    }
    try {
      await this.prisma.employee.update({ where: { id }, data });
    } catch (error) {
      this.friendly(error);
    }
    userCache.invalidate(id);
    return { status: 200, data: [], message: 'Employee profile updated successfully' };
  }

  async saveEmployeeSystemSettings(id: number, _dto: saveEmployeeSystemSettingsDto) {
    await this.findOne(id);
    return { status: 200, data: [], message: 'Settings saved' };
  }

  async disableAccount(id: number) {
    try {
      await this.prisma.employee.update({ where: { id }, data: { hasAccess: false } });
    } catch (error) {
      this.friendly(error);
    }
    userCache.invalidate(id);
    return { status: 200, data: [], message: 'Employee Account disabled successfully' };
  }
}

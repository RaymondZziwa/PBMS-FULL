import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, isFullAccessRole } from 'src/auth/permissions';
import { userCache } from 'src/auth/userCache';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from 'src/dto/roles.dto';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  private cleanName(name: unknown) {
    const n = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
    if (!n) throw new BadRequestException('Enter a role name');
    if (n.length > 80) throw new BadRequestException('The role name is too long');
    return n;
  }

  /** Only permission values that exist are kept (unknown ones are ignored). */
  private async cleanPermissions(list: unknown): Promise<string[]> {
    const raw = typeof list === 'string' ? (() => { try { return JSON.parse(list); } catch { return []; } })() : list;
    if (!Array.isArray(raw)) throw new BadRequestException('Permissions must be a list');
    const wanted = [...new Set(raw.filter((v): v is string => typeof v === 'string'))];
    if (!wanted.length) return [];
    const found = await this.prisma.permission.findMany({ where: { value: { in: wanted } }, select: { value: true } });
    return found.map((p) => p.value);
  }

  private async assertNameFree(name: string, id?: number) {
    const same = await this.prisma.role.findFirst({ where: { name, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (same) throw new ConflictException(`There's already a role called "${name}"`);
  }

  async create(data: CreateRoleDto): Promise<GenericResponse> {
    const name = this.cleanName(data.name);
    await this.assertNameFree(name);
    const permissions = await this.cleanPermissions(data.permissions ?? []);
    const role = await this.prisma.role.create({
      data: { name, permissions: { connect: permissions.map((value) => ({ value })) } },
      include: { permissions: true, _count: { select: { Employee: true } } },
    });
    return { status: 200, data: role, message: 'Role created' };
  }

  /** Roles with their permissions and who holds them. */
  async findAll(): Promise<GenericResponse> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        Employee: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
        permissions: { select: { id: true, name: true, value: true, module: true } },
      },
    });
    return { status: 200, data: roles, message: 'Roles fetched successfully' };
  }

  async update(id: number, data: UpdateRoleDto, me?: AuthenticatedUser): Promise<GenericResponse> {
    const existing = await this.prisma.role.findUnique({ where: { id }, include: { permissions: { select: { value: true } } } });
    if (!existing) throw new NotFoundException('Role not found');
    const name = data.name === undefined ? existing.name : this.cleanName(data.name);
    if (name !== existing.name) await this.assertNameFree(name, id);
    const permissions = data.permissions === undefined ? existing.permissions.map((p) => p.value) : await this.cleanPermissions(data.permissions);

    // Don't let someone remove their own ability to manage roles (they'd be locked out).
    if (me?.roleId === id && isFullAccessRole(existing) && !isFullAccessRole({ name, permissions })) {
      throw new ForbiddenException(
        "This is your own role. Saving it would remove your access to roles and permissions. Ask another administrator to make this change.",
      );
    }

    const role = await this.prisma.role.update({
      where: { id },
      data: { name, permissions: { set: permissions.map((value) => ({ value })) } },
      include: {
        Employee: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
        permissions: { select: { id: true, name: true, value: true, module: true } },
      },
    });
    // Signed-in users with this role pick up the change on their next request.
    userCache.invalidate();
    return { status: 200, data: role, message: 'Role saved' };
  }

  async remove(id: number, me?: AuthenticatedUser): Promise<GenericResponse> {
    if (me?.roleId === id) throw new ForbiddenException("You can't delete your own role");
    // Employees are linked to roles with ON DELETE CASCADE, so deleting a role
    // that people still hold would delete those people. Refuse instead.
    const people = await this.prisma.employee.count({ where: { roleId: id } });
    if (people > 0) {
      throw new ConflictException(`${people} employee(s) still have this role. Give them another role first.`);
    }
    await this.prisma.role.delete({ where: { id } });
    userCache.invalidate();
    return { status: 200, data: { id }, message: 'Role deleted' };
  }

  async getAllPermissions(): Promise<GenericResponse> {
    const permissions = await this.prisma.permission.findMany({
      select: {
        id: true,
        name: true,
        value: true,
        module: true,
      },
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = permissions.reduce(
      (acc, perm) => {
        const { module, ...rest } = perm;
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(rest);
        return acc;
      },
      {} as Record<string, Array<{ id: number; name: string; value: string }>>,
    );

    // Transform into array format
    const perms = Object.entries(grouped).map(([module, perms]) => ({
      module,
      permissions: perms,
    }));

    return {
      status: 200,
      data: perms,
      message: 'Permissions fetched successfully',
    };
  }
}

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LATER_PERMISSIONS } from './permissions';

/**
 * Creates permissions added after the database was first seeded
 * (for example "Record Attendance"), so admins can tick them on a role.
 * Safe to run on every start: it only inserts what is missing.
 */
@Injectable()
export class PermissionsSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const existing = await this.prisma.permission.findMany({
        where: { value: { in: LATER_PERMISSIONS.map((p) => p.value) } },
        select: { value: true },
      });
      const have = new Set(existing.map((p) => p.value));
      const missing = LATER_PERMISSIONS.filter((p) => !have.has(p.value));
      if (missing.length === 0) return;
      await this.prisma.permission.createMany({ data: missing, skipDuplicates: true });
      this.logger.log(`Added permissions: ${missing.map((p) => p.value).join(', ')}`);
    } catch (error) {
      this.logger.error('Could not sync permissions', error as Error);
    }
  }
}

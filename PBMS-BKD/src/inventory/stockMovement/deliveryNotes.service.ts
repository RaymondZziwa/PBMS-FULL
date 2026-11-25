import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import type { AuthenticatedUser } from 'src/auth/permissions';
import { cleanText, invalid, requireText } from '../inventory.helpers';

const INCLUDE = {
  employee: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { InventoryRecord: true } },
} as const;

@Injectable()
export class DeliveryNoteService {
  constructor(private prisma: PrismaService) {}

  async create(user: AuthenticatedUser, files: Express.Multer.File[] | undefined, body: Record<string, unknown>) {
    const images = (files ?? []).map((f) => `/uploads/dns/${f.filename}`);
    try {
      const name = requireText(body.name, 'name', 'who delivered it (supplier or company)', 120);
      const deliveryNoteNumber = requireText(body.deliveryNoteNumber, 'deliveryNoteNumber', 'the delivery note number', 60);
      if (!images.length) throw invalid('files', 'Attach a photo of the delivery note');
      const dup = await this.prisma.deliveryNote.findFirst({ where: { deliveryNoteNumber, name }, select: { id: true } });
      if (dup) throw invalid('deliveryNoteNumber', `Delivery note ${deliveryNoteNumber} from ${name} is already saved`);

      const data = await this.prisma.deliveryNote.create({
        data: { name, deliveryNoteNumber, images, notes: cleanText(body.notes, 1000), registeredBy: user.id },
        include: INCLUDE,
      });
      return { status: 201, data, message: `Delivery note ${deliveryNoteNumber} saved` };
    } catch (e) {
      await Promise.all((files ?? []).map((f) => unlink(f.path).catch(() => undefined)));
      throw e;
    }
  }

  async getAllDeliveryNotes() {
    const data = await this.prisma.deliveryNote.findMany({ include: INCLUDE, orderBy: { createdAt: 'desc' } });
    return { status: 200, message: 'Delivery notes fetched successfully', data };
  }

  /**
   * Deleting a note would also delete every stock movement that used it
   * (database cascade), so a note that is in use can't be deleted.
   */
  async deleteDeliveryNotes(id: number) {
    const note = await this.prisma.deliveryNote.findUnique({ where: { id }, include: { _count: { select: { InventoryRecord: true } } } });
    if (!note) throw new NotFoundException('Delivery note not found');
    if (note._count.InventoryRecord) {
      throw new ConflictException(`Delivery note ${note.deliveryNoteNumber} is attached to ${note._count.InventoryRecord} stock movement(s), so it can't be deleted`);
    }
    await this.prisma.deliveryNote.delete({ where: { id } });
    const images = Array.isArray(note.images) ? (note.images as unknown[]) : [];
    await Promise.all(
      images
        .filter((p): p is string => typeof p === 'string' && p.startsWith('/uploads/dns/'))
        .map((p) => unlink(join(process.cwd(), p)).catch(() => undefined)),
    );
    return { status: 200, message: 'Delivery note deleted', data: { id } };
  }
}

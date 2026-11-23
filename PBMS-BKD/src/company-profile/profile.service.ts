import { BadRequestException, Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** What the settings screen may change (anything else in the request is ignored). */
export type CompanyInput = {
  name?: string;
  email?: string;
  tel1?: string;
  tel2?: string | null;
  phoneNumbers?: string[];
  address?: string;
  logoPath?: string;
  website?: string | null;
  tinNumber?: string | null;
  description?: string | null;
  foundedYear?: string | number | null;
  industry?: string | null;
  employees?: string | null;
  workHours?: string | number | null;
};

const text = (v: unknown) => (v === undefined ? undefined : v === null || String(v).trim() === '' ? null : String(v).trim());

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<Company | null> {
    return this.prisma.company.findFirst({ orderBy: { id: 'asc' } });
  }

  /**
   * Saves the one company profile. If none exists yet (fresh install), it is
   * created, so the settings screen always works.
   */
  async update(id: number, input: CompanyInput): Promise<Company> {
    const data: Prisma.CompanyUpdateInput = {};
    const setText = (key: keyof Prisma.CompanyUpdateInput, value: unknown, required = false) => {
      const v = text(value);
      if (v === undefined) return;
      if (required && !v) throw new BadRequestException(`${String(key)} can't be empty`);
      (data as Record<string, unknown>)[key] = v;
    };

    setText('name', input.name, true);
    setText('email', input.email, true);
    setText('address', input.address, true);
    setText('website', input.website);
    setText('tinNumber', input.tinNumber);
    setText('description', input.description);
    setText('industry', input.industry);
    setText('employees', input.employees);

    const phones = input.phoneNumbers ?? (input.tel1 !== undefined || input.tel2 !== undefined ? [input.tel1 ?? '', input.tel2 ?? ''] : undefined);
    if (phones) {
      const [tel1, tel2] = phones.map((p) => (p ?? '').trim());
      if (!tel1) throw new BadRequestException('Add at least one phone number');
      data.tel1 = tel1;
      data.tel2 = tel2 || null;
    }

    if (input.workHours !== undefined && input.workHours !== null && input.workHours !== '') {
      const h = Number(input.workHours);
      if (!Number.isFinite(h) || h <= 0 || h > 24) throw new BadRequestException('Working hours must be between 1 and 24');
      data.workHours = h;
    }
    if (input.foundedYear !== undefined) {
      const y = input.foundedYear === null || input.foundedYear === '' ? null : Number(input.foundedYear);
      if (y !== null && (!Number.isInteger(y) || y < 1800 || y > new Date().getFullYear())) {
        throw new BadRequestException('Founded year is not valid');
      }
      data.foundedYear = y;
    }
    if (input.logoPath) data.logo = input.logoPath;

    const existing = id ? await this.prisma.company.findUnique({ where: { id } }) : await this.getProfile();
    if (existing) {
      return this.prisma.company.update({ where: { id: existing.id }, data });
    }
    if (!data.name || !data.email || !data.tel1 || !data.address) {
      throw new BadRequestException('Name, email, a phone number and address are needed to set up the company');
    }
    return this.prisma.company.create({ data: data as Prisma.CompanyCreateInput });
  }
}

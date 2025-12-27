// src/bank/bank.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBankDto, UpdateBankDto } from 'src/dto/bank.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBankDto) {
    return this.prisma.bank.create({ data });
  }

  findAll() {
    return this.prisma.bank.findMany();
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({ where: { id } });
    if (!bank) throw new NotFoundException(`Bank with id ${id} not found`);
    return bank;
  }

  async update(id: string, data: UpdateBankDto) {
    await this.findOne(id); // ensure exists
    return this.prisma.bank.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists
    return this.prisma.bank.delete({ where: { id } });
  }
}

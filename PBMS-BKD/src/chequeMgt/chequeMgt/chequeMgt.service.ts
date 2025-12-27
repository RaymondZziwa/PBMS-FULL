import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateChequeDto, UpdateChequeDto } from 'src/dto/chequeMgt.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChequeService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateChequeDto) {
    return this.prisma.cheque.create({
      data: {
        ...data,
        status: 'PENDING',
        amount: data.amount,
        bankingDate: new Date(data.bankingDate),
      },
    });
  }

  findAll() {
    return this.prisma.cheque.findMany({
      include: { bank: true },
      orderBy: { createdAt: 'desc' }, // optional: eager load related Bank
    });
  }

  async findOne(id: string) {
    const cheque = await this.prisma.cheque.findUnique({
      where: { id },
      include: { bank: true },
    });
    if (!cheque) throw new NotFoundException(`Cheque with id ${id} not found`);
    return cheque;
  }

  async update(id: string, data: UpdateChequeDto) {
    const { bankId, ...rest } = data;

    return this.prisma.cheque.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.bankingDate && { bankingDate: new Date(rest.bankingDate) }),
        status: data.status as 'PENDING' | 'PAID' | 'BOUNCED',
        bank: {
          connect: { id: bankId },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.cheque.delete({ where: { id } });
  }
}

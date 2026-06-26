import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateClientAccountDto, DepositDto } from 'src/dto/patientAccount.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ClientAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClientAccountDto) {
    const acc = await this.prisma.patientAccount.create({
      data: dto,
    });

    await this.prisma.client.update({
      where: {
        id: dto.clientId,
      },
      data: {
        hasAccount: true,
      },
    });

    return {
      data: acc,
      message: 'Account created successfullly',
      status: 200,
    };
  }

  async findAll() {
    const accs = await this.prisma.patientAccount.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        client: true,
        PatientAccountTransaction: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return {
      data: accs,
      message: 'Accounts fetched successfully',
      status: 200,
    };
  }

  async findOne(id: number) {
    const acc = await this.prisma.patientAccount.findUnique({
      where: { id },
      include: {
        PatientAccountTransaction: true,
      },
    });
    if (!acc) throw new NotFoundException(`Account with id ${id} not found`);
    return {
      data: acc,
      message: 'Account fetched successfullly',
      status: 200,
    };
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.patientAccount.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });

    return {
      data: [],
      message: 'Account deactivated successfullly',
      status: 200,
    };
  }

  async activate(id: number) {
    await this.findOne(id);
    await this.prisma.patientAccount.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
    });

    return {
      data: [],
      message: 'Account activated successfullly',
      status: 200,
    };
  }

  async deposit(data: DepositDto) {
    const acc = await this.prisma.patientAccount.findUnique({
      where: {
        id: data.accId,
      },
    });

    if (!acc)
      throw new NotFoundException(`Account with id ${data.accId} not found`);

    if (acc.status === 'INACTIVE')
      throw new BadRequestException('Account is inactive. ');

    await this.prisma.patientAccountTransaction.create({
      data: {
        accountId: acc.id,
        type: 'DEPOSIT',
        amount: data.amount,
        notes: data.notes,
      },
    });

    const updatedAcc = await this.prisma.patientAccount.update({
      where: {
        id: data.accId,
      },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    });

    return {
      data: updatedAcc,
      message: 'Account deposit successful',
      status: 200,
    };
  }
}

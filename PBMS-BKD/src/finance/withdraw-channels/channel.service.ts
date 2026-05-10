import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';

@Injectable()
export class ChannelService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(data: {
    type: 'BANK_TRANSFER' | 'MOBILE_MONEY';
    name: string;
    phoneNumber?: string;
    bank?: string;
    accountNumber?: string;
  }): Promise<GenericResponse> {
    const channel = await this.prismaService.withdrawChannel.create({ data });
    return {
      status: 200,
      data: channel,
      message: 'Channel created successfully',
    };
  }

  async findAll(): Promise<GenericResponse> {
    const channels = await this.prismaService.withdrawChannel.findMany({
      include: {
        Wallet: true,
      },
    });
    return {
      status: 200,
      data: channels,
      message: 'Channels fetched successfully',
    };
  }

  async update(
    id: number,
    data: {
      type?: 'BANK_TRANSFER' | 'MOBILE_MONEY';
      name?: string;
      phoneNumber?: string;
      bank?: string;
      accountNumber?: string;
    },
  ): Promise<GenericResponse> {
    const channel = await this.prismaService.withdrawChannel.update({
      where: { id },
      data,
    });
    return {
      status: 200,
      data: channel,
      message: 'Channel modified successfully',
    };
  }

  async remove(id: number): Promise<GenericResponse> {
    const channel = await this.prismaService.withdrawChannel.delete({
      where: { id },
    });
    return {
      status: 200,
      data: channel,
      message: 'Channel deleted successfully',
    };
  }
}

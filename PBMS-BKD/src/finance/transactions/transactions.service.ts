import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { GenericResponse } from 'src/utils/genericResponse';
import { WithdrawToBankDto } from './dtos/transferToBank.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TransactionService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async withdraw(data: WithdrawToBankDto): Promise<GenericResponse> {
    //use the channelId to get the withdraw channel details --bank_name, bank_account_number, bank_account_name
    const channel = await this.prismaService.withdrawChannel.findUnique({
      where: { id: data.channelId },
    });

    if (!channel) {
      return {
        status: 404,
        data: null,
        message: 'Withdraw channel not found',
      };
    }

    //call the marz api to initiate the transfer to bank
    const payload = {
      amount: data.amount,
      description: data.description,
      bank_name: channel.bank,
      bank_account_number: channel.accountNumber,
      bank_account_name: channel.name,
      wallet_source: this.configService.getOrThrow<string>('MARZ_WALLET_SRC'),
    };

    const authHeader = this.configService.get<string>('MARZ_AUTH_HEADER');

    //get them from the withdraw request response
    const response = await firstValueFrom(
      this.httpService.post(
        this.configService.getOrThrow<string>('MARZ_TRANSFER_BASE_URL'),
        payload,
        {
          headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    //console.log('Marz transfer response:', response.data.data);
    //create the transfer transaction record in the database with status pending
    // const transaction = await this.prismaService.withdrawHistory.create({
    //   data: {
    //     amount: data.amount,
    //     description: data.description,
    //     channelId: data.channelId,
    //     status: 'PENDING',
    //     reference: reference,
    //     currency: 'UGX',
    //   },
    // });
    return {
      status: 200,
      data: null,
      //data: transaction,
      message: 'Transaction created successfully',
    };
  }

  async checkTransferStatus(reference: string): Promise<GenericResponse> {
    //call the marz api to check the transfer status using the reference id
    const authHeader = this.configService.get<string>('MARZ_AUTH_HEADER');

    // const response = await firstValueFrom(
    //   this.httpService.get(
    //     `${this.configService.getOrThrow<string>(
    //       'MARZ_COLLECTION_BASE_URL',
    //     )}/status/${id}`,
    //     {
    //       headers: {
    //         Authorization: `Basic ${authHeader}`,
    //         'Content-Type': 'application/json',
    //       },
    //     },
    //   ),
    // );

    //update the transfer transaction record in the database with the new status
    // const transaction = await this.prismaService.withdrawHistory.update({
    //   where: { reference: reference },
    //   data: {
    //     status: response.data.status,
    //   },
    // });

    return {
      status: 200,
      data: [],
      message: 'Transfer status updated successfully',
    };
  }

  async findAll(): Promise<GenericResponse> {
    const channels = await this.prismaService.withdrawChannel.findMany();
    return {
      status: 200,
      data: channels,
      message: 'Channels fetched successfully',
    };
  }
}

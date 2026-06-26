import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientController } from './customer.controller';
import { ClientService } from './customer.service';
import { ClientAccountService } from './customerAccounts.service';

@Module({
  controllers: [ClientController],
  providers: [ClientService, PrismaService, ClientAccountService],
})
export class ClientModule {}

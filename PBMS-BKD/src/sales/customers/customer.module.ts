import { Module } from '@nestjs/common';
import { ClientController } from './customer.controller';
import { ClientService } from './customer.service';
import { ClientAccountService } from './customerAccounts.service';

@Module({
  controllers: [ClientController],
  providers: [ClientService, ClientAccountService],
})
export class ClientModule {}

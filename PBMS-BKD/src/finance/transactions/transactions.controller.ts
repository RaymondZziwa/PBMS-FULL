import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WithdrawToBankDto } from './dtos/transferToBank.dto';
import { TransactionService } from './transactions.service';

@Controller('api/transactions')
export class TransactionsController {
  constructor(private readonly transactionService: TransactionService) {}

  //Withdraw to Bank
  @Post('withdraw')
  withdrawToBank(@Body() data: WithdrawToBankDto) {
    return this.transactionService.withdraw(data);
  }

  //check transfer status, the id is the reference id of the transfer transaction
  @Get('transfer-status/:id')
  checkTransferStatus(@Param() id: string) {
    console.log('Data received in controller:', id);
  }

  //get all transactions
  @Get('all')
  findAllTransactions() {
    console.log('Fetching all transactions');
  }
}

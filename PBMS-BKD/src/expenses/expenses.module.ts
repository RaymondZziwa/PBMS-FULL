import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BranchExpenseController } from './expenses.controller';
import { BranchExpenseService } from './expenses.service';

@Module({
  imports: [PrismaModule],
  providers: [BranchExpenseService],
  controllers: [BranchExpenseController],
})
export class BranchExpenseModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChequeController } from './chequeMgt.controller';
import { ChequeService } from './chequeMgt.service';

@Module({
  controllers: [ChequeController],
  providers: [ChequeService, PrismaService],
})
export class ChequeModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesController } from './pos.controller';
import { SalesService } from './pos.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, PrismaService],
})
export class PosModule {}

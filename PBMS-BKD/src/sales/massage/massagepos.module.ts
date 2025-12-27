import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MassageSalesController } from './massage.controller';
import { MassageSalesService } from './massage.service';

@Module({
  controllers: [MassageSalesController],
  providers: [MassageSalesService, PrismaService],
})
export class MassagePosModule {}

import { Module } from '@nestjs/common';
import { MassageSalesController } from './massage.controller';
import { MassageSalesService } from './massage.service';

@Module({
  controllers: [MassageSalesController],
  providers: [MassageSalesService],
})
export class MassagePosModule {}

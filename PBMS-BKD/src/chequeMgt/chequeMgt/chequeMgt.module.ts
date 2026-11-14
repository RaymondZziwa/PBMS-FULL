import { Module } from '@nestjs/common';
import { ChequeController } from './chequeMgt.controller';
import { ChequeService } from './chequeMgt.service';

@Module({
  controllers: [ChequeController],
  providers: [ChequeService],
})
export class ChequeModule {}

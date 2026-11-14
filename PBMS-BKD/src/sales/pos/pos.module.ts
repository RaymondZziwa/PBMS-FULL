import { Module } from '@nestjs/common';
import { SalesController } from './pos.controller';
import { SalesService } from './pos.service';
import { ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [SalesController],
  providers: [SalesService, ConfigService],
})
export class PosModule {}

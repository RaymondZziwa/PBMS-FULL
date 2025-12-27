import { Module } from '@nestjs/common';
import { FarmController } from './farm.controller';
import { FarmService } from './farm.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SeedlingDeathService } from './seedlingDeath.service';
import { SeedlingDeathController } from './seedlingDeath.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FarmController, SeedlingDeathController],
  providers: [FarmService, SeedlingDeathService],
  exports: [FarmService],
})
export class FarmModule {}

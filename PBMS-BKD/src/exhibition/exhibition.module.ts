import { Module } from '@nestjs/common';
import { ExhibitionService } from './exhibition.service';
import { ExhibitionController } from './exhibition.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExhibitionStoreController } from './exhibitionStore.controller';
import { ExhibitionStoreService } from './exhibitionStore.service';
import { ExhibitionExpensesController } from './exhibitionExpenses.controller';
import { ExhibitionExpensesService } from './exhibitionExpenses.service';
import { ExhibitionStockMovementController } from './exhibitionInventory.controller';
import { ExhibitionStockMovementService } from './exhibitionInventory.service';
import { ExhibitionSalesController } from './exhibitionSale.controller';
import { ExhibitionSalesService } from './exhibitionSale.service';

@Module({
  controllers: [
    ExhibitionController,
    ExhibitionStoreController,
    ExhibitionSalesController,
    ExhibitionStockMovementController,
    ExhibitionExpensesController,
  ],
  providers: [
    ExhibitionStockMovementService,
    ExhibitionSalesService,
    ExhibitionStoreService,
    ExhibitionService,
    ExhibitionExpensesService,
    PrismaService,
  ],
  exports: [
    ExhibitionService,
    ExhibitionStoreService,
    ExhibitionSalesService,
    ExhibitionExpensesService,
  ],
})
export class ExhibitionModule {}

import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectSalesController } from './projectSales/sales.controller';
import { ProjectSalesService } from './projectSales/sales.service';
import { ProjectPaymentsController } from './projectPayments/payments.controller';
import { ProjectPaymentsService } from './projectPayments/payments.service';

@Module({
  controllers: [
    ProjectsController,
    ProjectSalesController,
    ProjectPaymentsController,
  ],
  providers: [
    ProjectsService,
    ProjectSalesService,
    ProjectPaymentsService,
  ],
})
export class ProjectsModule {}

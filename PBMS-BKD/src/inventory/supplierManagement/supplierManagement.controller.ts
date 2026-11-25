import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PdfResponseInterceptor } from 'src/utils/pdfGenerator/pdf-response.interceptor';
import { SupplierService } from './supplierManagement.service';
import { CurrentUser, RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';
import type { AuthenticatedUser } from 'src/auth/permissions';
import { imageUpload } from '../inventory.helpers';

@Controller('api/suppliers')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post('save-supplier')
  @HttpCode(HttpStatus.OK)
  create(@Body() body: Record<string, unknown>) {
    return this.supplierService.create(body);
  }

  @Get('fetch-suppliers')
  findAll() {
    return this.supplierService.findAll();
  }

  @Get('get-supplier/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.findOne(id);
  }

  @Put('update/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.supplierService.update(id, body);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.remove(id);
  }

  /** Goods received from a supplier (multipart; optional photo in `proofImage`). */
  @Post(':id/save-supply')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('proofImage', imageUpload('supply-evidence', 'supply')))
  saveSupply(
    @Param('id') supplierId: string,
    @UploadedFile() proofImage: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierService.createSupply(user, supplierId, proofImage ?? null, body);
  }

  @Put('supplies/modify/:supplyId')
  @UseInterceptors(FileInterceptor('proofImage', imageUpload('supply-evidence', 'supply')))
  modifySupply(
    @Param('supplyId') id: string,
    @UploadedFile() proofImage: Express.Multer.File | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    return this.supplierService.modifySupply(id, proofImage ?? null, body);
  }

  @Delete('supplies/delete/:supplyId')
  deleteSupply(@Param('supplyId') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.supplierService.deleteSupply(user, id);
  }

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('proofImage', imageUpload('supply-payment-evidence', 'payment')))
  processSupplierPayment(
    @Body() body: Record<string, unknown>,
    @UploadedFile() proofImage: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.supplierService.processSupplierPayment(user, proofImage ?? null, body);
  }

  @Delete('payments/delete/:paymentId')
  deletePayment(@Param('paymentId', ParseIntPipe) id: number) {
    return this.supplierService.deletePayment(id);
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.REPORTS)
  @Get('report')
  getSupplierReport() {
    return this.supplierService.getAllSuppliersReport();
  }

  @RequirePermissions(PERMISSIONS.INVENTORY, PERMISSIONS.REPORTS)
  @Get('report/export')
  @UseInterceptors(PdfResponseInterceptor)
  exportSuppliersReportPDF() {
    return this.supplierService.exportSuppliersReportPDF();
  }
}

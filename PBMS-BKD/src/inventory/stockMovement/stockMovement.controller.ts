import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { StockMovementService } from './stockMovement.service';
import { DeliveryNoteService } from './deliveryNotes.service';
import { CurrentUser, RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';
import type { AuthenticatedUser } from 'src/auth/permissions';
import { imageUpload } from '../inventory.helpers';

/**
 * Stock movements and delivery notes. Who did it always comes from the
 * signed-in account, never from the form.
 */
@Controller('api/stock-movement')
@RequirePermissions(PERMISSIONS.INVENTORY)
export class StockMovementController {
  constructor(
    private readonly stockMovementService: StockMovementService,
    private readonly deliveryNotes: DeliveryNoteService,
  ) {}

  /** One or more items: send `items` as JSON [{itemId, unitId, qty}], plus optional photos in `files`. */
  @Post('create')
  @UseInterceptors(FilesInterceptor('files', 10, imageUpload('evidence', 'mvt')))
  create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockMovementService.create(user, files, body);
  }

  @Post('confirm-transfer')
  confirm(@Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    return this.stockMovementService.confirmStockTransfer(user, body);
  }

  @Post('reject-transfer')
  reject(@Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    return this.stockMovementService.rejectStockTransfer(user, body);
  }

  @Get('fetch-all')
  fetchAll() {
    return this.stockMovementService.getAllStockMovementRecords();
  }

  @Post('resolve-stock-transfer-conflict/:id')
  resolveConflict(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { notes?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stockMovementService.resolveStockMvtConflict(user, id, body?.notes);
  }

  @Post('delivery-note/create')
  @UseInterceptors(FilesInterceptor('files', 10, imageUpload('dns', 'dn')))
  createDeliveryNote(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveryNotes.create(user, files, body);
  }

  @Get('fetch-all-dns')
  fetchAllDeliveryNotes() {
    return this.deliveryNotes.getAllDeliveryNotes();
  }

  /** Kept as POST for older screens; DELETE is the same. */
  @Post('delete-dn/:id')
  deleteDnLegacy(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryNotes.deleteDeliveryNotes(id);
  }

  @Delete('delivery-note/:id')
  deleteDn(@Param('id', ParseIntPipe) id: number) {
    return this.deliveryNotes.deleteDeliveryNotes(id);
  }
}

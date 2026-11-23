import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { MarzPayService } from './marzpay.service';
import { Public, RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/payments/marzpay')
@RequirePermissions(PERMISSIONS.SALES, PERMISSIONS.FINANCE, PERMISSIONS.EXHIBITION)
export class MarzPayController {
  constructor(private readonly marzPayService: MarzPayService) {}

  @Public()
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async handleCallback(@Body() callbackData: any) {
    return this.marzPayService.processCallback(callbackData);
  }

  @Post('check-status/:reference')
  async checkTransactionStatus(@Param('reference') reference: string) {
    return this.marzPayService.checkTransactionStatus(reference);
  }
}

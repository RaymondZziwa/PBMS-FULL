import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BillingChannelsService } from './billingChannels.service';
import {
  CreateBillingChannelDto,
  UpdateBillingChannelDto,
  VerifyBillingChannelDto,
} from 'src/dto/billingChannel.dto';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/billing-channels')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class BillingChannelsController {
  constructor(private readonly billingChannelsService: BillingChannelsService) {}

  /** Also used by the expense screens to pick a meter, so expenses staff can read the list. */
  @Get('all')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS, PERMISSIONS.EXPENSES)
  findAll() {
    return this.billingChannelsService.findAll();
  }

  @Get('nwsc-areas')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS, PERMISSIONS.EXPENSES)
  getNwscAreas() {
    return this.billingChannelsService.getNwscAreas();
  }

  @Post('create')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  create(@Body() dto: CreateBillingChannelDto) {
    return this.billingChannelsService.create(dto);
  }

  @Put('update/:id')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBillingChannelDto) {
    return this.billingChannelsService.update(id, dto);
  }

  @Delete('delete/:id')
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.billingChannelsService.remove(id);
  }

  /** Verifies the saved meter with MarzPay (the meter number comes from the database, not the request). */
  @Post('verify/:id')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  verify(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyBillingChannelDto) {
    return this.billingChannelsService.verifyChannel(id, dto.area);
  }
}

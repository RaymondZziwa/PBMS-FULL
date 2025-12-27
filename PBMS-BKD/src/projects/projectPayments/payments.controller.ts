// src/controllers/project-payments.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CreatePaymentDto, UpdatePaymentDto } from 'src/dto/project.dto';
import { ProjectPaymentsService } from './payments.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';

@Controller('api/project-payments')
export class ProjectPaymentsController {
  constructor(
    private readonly projectPaymentsService: ProjectPaymentsService,
  ) {}

  @Post('create')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.projectPaymentsService.addPayment(createPaymentDto);
  }

  @Get('sale/:saleId')
  async getPaymentsBySale(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.projectPaymentsService.getPaymentsBySale(saleId);
  }

  @Get(':id')
  async getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectPaymentsService.getPayment(id);
  }

  @Put('modify/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async modifyPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ) {
    return this.projectPaymentsService.modifyPayment(id, updatePaymentDto);
  }

  @Delete('delete/:id')
  async deletePayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectPaymentsService.deletePayment(id);
  }

  @Get('summary/sale/:saleId')
  async getPaymentSummary(@Param('saleId', ParseUUIDPipe) saleId: string) {
    return this.projectPaymentsService.getPaymentSummary(saleId);
  }

  @Post('upload-payment-receipt/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/project-payment-receipts'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `receipt-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new Error('Only image files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    }),
  )
  async uploadProjectPaymentReceipt(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.projectPaymentsService.uploadProjectPaymentReceipt(
      id,
      file,
    );
  }

  @Post('upload-bank-deposit-slip/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/project-bank-deposit-slips'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `slip-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(new Error('Only image files are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    }),
  )
  async uploadProjectDeliveryNote(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.projectPaymentsService.uploadProjectPaymentBankDepositSlip(
      id,
      file,
    );
  }
}

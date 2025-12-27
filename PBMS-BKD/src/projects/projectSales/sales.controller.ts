import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  CreateProjectSaleDto,
  AddPaymentDto,
  UpdateProjectSaleDto,
} from 'src/dto/project.dto';
import { ProjectSalesService } from './sales.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join, extname } from 'path';

@Controller('api/project-sales')
export class ProjectSalesController {
  constructor(private readonly projectSalesService: ProjectSalesService) {}

  @Post('create')
  create(@Body() createProjectSaleDto: CreateProjectSaleDto) {
    return this.projectSalesService.create(createProjectSaleDto);
  }

  @Get('fetch-all')
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
    @Query('cashierId') cashierId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      ...(clientId && { clientId }),
      ...(projectId && { projectId }),
      ...(cashierId && { cashierId }),
      ...(status && { status }),
      ...(startDate && endDate && { startDate, endDate }),
    };

    return this.projectSalesService.findAll(page, limit, filters);
  }

  @Get('summary')
  getSummary(@Query('period') period?: 'day' | 'week' | 'month' | 'year') {
    return this.projectSalesService.getSalesSummary(period);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectSalesService.findOne(id);
  }

  @Get(':id/payment-schedule')
  getPaymentSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectSalesService.getPaymentSchedule(id);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addPaymentDto: AddPaymentDto,
  ) {
    return this.projectSalesService.addPayment(id, addPaymentDto);
  }

  @Patch('modify/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectSaleDto: UpdateProjectSaleDto,
  ) {
    return this.projectSalesService.update(id, updateProjectSaleDto);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectSalesService.remove(id);
  }

  @Post('upload-delivery-note/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/project-delivery-notes'),
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `project-sale-${uniqueSuffix}${ext}`);
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
    return await this.projectSalesService.uploadProjectSaleDeliveryNote(
      id,
      file,
    );
  }
}

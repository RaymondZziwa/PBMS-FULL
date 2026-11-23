import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { CompanyService } from './profile.service';
import { RequirePermissions } from 'src/auth/decorators';
import { PERMISSIONS } from 'src/auth/permissions';

@Controller('api/company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get('profile')
  getCompanyProfile() {
    return this.companyService.getProfile();
  }

  @RequirePermissions(PERMISSIONS.COMPANY_SETTINGS)
  @Patch('modify/:id')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(file.originalname) || !/^image\//.test(file.mimetype)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  async updateCompany(
    @Param('id') id: string,
    @UploadedFile() logo: Express.Multer.File,
    @Body() body: Record<string, unknown>,
  ) {
    const phoneNumbers =
      typeof body.phoneNumbers === 'string'
        ? (JSON.parse(body.phoneNumbers) as string[])
        : Array.isArray(body.phoneNumbers)
          ? (body.phoneNumbers as string[])
          : undefined;

    // Only known fields are passed on (the old code saved whatever was sent).
    const data = await this.companyService.update(Number(id) || 0, {
      name: body.name as string | undefined,
      email: body.email as string | undefined,
      tel1: body.tel1 as string | undefined,
      tel2: body.tel2 as string | undefined,
      phoneNumbers,
      address: body.address as string | undefined,
      website: body.website as string | undefined,
      tinNumber: body.tinNumber as string | undefined,
      description: body.description as string | undefined,
      foundedYear: body.foundedYear as string | undefined,
      industry: body.industry as string | undefined,
      employees: body.employees as string | undefined,
      workHours: body.workHours as string | undefined,
      logoPath: logo ? `/uploads/logos/${logo.filename}` : undefined,
    });
    return { status: 200, data, message: 'Company profile saved' };
  }
}

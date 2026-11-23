import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Put,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { EmployeeService } from './employee.service';
import {
  CreateEmployeeDto,
  employeeProfileUpdateDto,
  saveEmployeeSystemSettingsDto,
  UpdateEmployeeDto,
} from 'src/dto/humanResource.dto';
import { CurrentUser, RequirePermissions, SignedIn } from 'src/auth/decorators';
import {
  hasAnyPermission,
  PERMISSIONS,
  type AuthenticatedUser,
} from 'src/auth/permissions';

/** HR or "Register/Modify Employees" may manage anyone; others only themselves. */
const assertSelfOrHr = (user: AuthenticatedUser, id: number) => {
  if (user?.id === id) return;
  if (hasAnyPermission(user, PERMISSIONS.HR, PERMISSIONS.EMPLOYEES)) return;
  throw new ForbiddenException("You can only change your own profile");
};

@Controller('api/employees')
@RequirePermissions(PERMISSIONS.HR, PERMISSIONS.EMPLOYEES)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('create')
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.create(dto, user);
  }

  /**
   * Other screens pick a person from this list (attendance, expenses, store keepers),
   * so those roles may list employees too, but salaries are blanked unless the
   * viewer has HR or payroll access.
   */
  @Get('fetch-all')
  @RequirePermissions(
    PERMISSIONS.HR,
    PERMISSIONS.EMPLOYEES,
    PERMISSIONS.PAYROLL,
    PERMISSIONS.ATTENDANCE,
    PERMISSIONS.EXPENSES,
    PERMISSIONS.INVENTORY,
    PERMISSIONS.STORES,
  )
  findAll(@CurrentUser() user: AuthenticatedUser) {
    const showSalary = hasAnyPermission(user, PERMISSIONS.HR, PERMISSIONS.EMPLOYEES, PERMISSIONS.PAYROLL);
    return this.employeeService.findAll(showSalary);
  }

  @Get('fetch/:id')
  @SignedIn()
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    assertSelfOrHr(user, id);
    return this.employeeService.findOne(id);
  }

  @Patch('modify/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.employeeService.update(id, dto, user);
  }

  @Delete('delete/:id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.remove(id, user);
  }

  @Put('update-profile/:id')
  @SignedIn()
  profileUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: employeeProfileUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrHr(user, id);
    return this.employeeService.employeeProfileUpdate(id, dto);
  }

  /** Upload and update employee profile picture */
  @Post('upload-profile-picture/:id')
  @SignedIn()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/images'),
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `employee-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const okType = /^image\/(jpe?g|png|gif|webp)$/.test(file.mimetype);
        const okExt = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
        if (!okType || !okExt) cb(new Error('Only image files are allowed!'), false);
        else cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    }),
  )
  async uploadProfilePicture(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrHr(user, id);
    return await this.employeeService.updateProfileImage(id, file);
  }

  @Get('export-profile')
  @SignedIn()
  exportProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.employeeService.exportEmployeeData(user.id);
  }

  @Post('save-settings/:id')
  @SignedIn()
  saveEmployeeSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: saveEmployeeSystemSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrHr(user, id);
    return this.employeeService.saveEmployeeSystemSettings(id, dto);
  }

  @Put('disable/:id')
  @SignedIn()
  disableEmployeeAccount(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    assertSelfOrHr(user, id);
    return this.employeeService.disableAccount(id);
  }
}

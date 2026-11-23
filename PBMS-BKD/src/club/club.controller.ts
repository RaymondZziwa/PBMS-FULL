import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { ClubMember } from '@prisma/client';
import { CurrentUser, Public, RequirePermissions } from 'src/auth/decorators';
import { AuthenticatedUser, PERMISSIONS } from 'src/auth/permissions';
import { AllowBeforePasswordChange, ClubAuthGuard, CurrentMember } from './club-auth';
import { clubUpload } from './club-files';
import { ClubMembersService } from './club-members.service';
import { ClubPaymentsService } from './club-payments.service';
import { ClubTrackerService } from './club-tracker.service';
import { CLUB_TITLES, MAX_ATTACHMENTS } from './club.constants';

/**
 * Public club routes: apply, sign in, payment callbacks.
 * @Public() skips the staff sign-in; nothing here returns member data without a member token.
 */
@Public()
@Controller('api/club')
export class ClubPublicController {
  constructor(
    private readonly members: ClubMembersService,
    private readonly payments: ClubPaymentsService,
  ) {}

  @Get('info')
  info() {
    return { status: 200, data: { titles: CLUB_TITLES, maxAttachments: MAX_ATTACHMENTS, charge: this.payments.quote().data }, message: 'Club info' };
  }

  @Post('register')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'photo', maxCount: 1 }, { name: 'attachments', maxCount: MAX_ATTACHMENTS }], clubUpload))
  register(@Body('data') data: string, @UploadedFiles() files: { photo?: Express.Multer.File[]; attachments?: Express.Multer.File[] }) {
    return this.members.register(data, files);
  }

  @Post('auth/login')
  @HttpCode(200)
  login(@Body() body: { identifier?: unknown; password?: unknown }) {
    return this.members.login(body?.identifier, body?.password);
  }

  @Post('payments/collection-callback')
  @HttpCode(200)
  collectionCallback(@Body() body: Record<string, unknown>) {
    return this.payments.collectionCallback(body);
  }

  @Post('payments/payout-callback')
  @HttpCode(200)
  payoutCallback(@Body() body: Record<string, unknown>) {
    return this.payments.payoutCallback(body);
  }
}

/** The signed-in member's own account (Monk Club app). */
@Public() // not a staff route: ClubAuthGuard checks the member token instead
@UseGuards(ClubAuthGuard)
@Controller('api/club/me')
export class ClubMemberController {
  constructor(
    private readonly members: ClubMembersService,
    private readonly payments: ClubPaymentsService,
    private readonly tracker: ClubTrackerService,
  ) {}

  @Get()
  @AllowBeforePasswordChange()
  me(@CurrentMember() m: ClubMember) {
    return this.members.me(m);
  }

  @Post('password')
  @HttpCode(200)
  @AllowBeforePasswordChange()
  changePassword(@CurrentMember() m: ClubMember, @Body() body: { currentPassword?: unknown; newPassword?: unknown }) {
    return this.members.changePassword(m, body?.currentPassword, body?.newPassword);
  }

  @Patch()
  update(@CurrentMember() m: ClubMember, @Body() body: Record<string, unknown>) {
    return this.members.updateMe(m, body);
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('photo', clubUpload))
  photo(@CurrentMember() m: ClubMember, @UploadedFile() file?: Express.Multer.File) {
    return this.members.setPhoto(m.id, file);
  }

  @Get('tracker')
  myTracker(@CurrentMember() m: ClubMember, @Query('year') year?: string) {
    return this.tracker.get(m.id, Number(year) || new Date().getFullYear());
  }

  @Get('payments')
  myPayments(@CurrentMember() m: ClubMember) {
    return this.payments.myPayments(m);
  }

  @Post('payments/registration')
  @HttpCode(200)
  payRegistration(@CurrentMember() m: ClubMember, @Body() body: { phone?: unknown }) {
    return this.payments.startRegistration(m, body?.phone);
  }

  @Get('payments/:id')
  paymentStatus(@CurrentMember() m: ClubMember, @Param('id', ParseIntPipe) id: number) {
    return this.payments.paymentStatus(m, id);
  }
}

/** PBMS staff: Monk Loyalty Club administration. */
@RequirePermissions(PERMISSIONS.LOYALTY)
@Controller('api/club/admin')
export class ClubAdminController {
  constructor(
    private readonly members: ClubMembersService,
    private readonly payments: ClubPaymentsService,
    private readonly tracker: ClubTrackerService,
  ) {}

  @Get('members')
  list(@Query() q: { status?: string; search?: string; page?: string; pageSize?: string }) {
    return this.members.list(q);
  }

  @Get('members/:id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.members.get(id);
  }

  @Patch('members/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    return this.members.adminUpdate(id, body);
  }

  @Post('members/:id/photo')
  @UseInterceptors(FileInterceptor('photo', clubUpload))
  photo(@Param('id', ParseIntPipe) id: number, @UploadedFile() file?: Express.Multer.File) {
    return this.members.setPhoto(id, file);
  }

  @Get('members/:id/attachments/:attachmentId')
  async attachment(@Param('id', ParseIntPipe) id: number, @Param('attachmentId', ParseIntPipe) attachmentId: number, @Res({ passthrough: true }) res: Response) {
    const f = await this.members.attachmentFile(id, attachmentId);
    if (!existsSync(f.path)) {
      res.status(404);
      return { statusCode: 404, message: 'The file is missing on the server' };
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return new StreamableFile(createReadStream(f.path), { type: f.mimeType, disposition: `inline; filename="${f.name.replace(/[^\w.\- ]+/g, '_')}"` });
  }

  @Post('members/:id/approve')
  @HttpCode(200)
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.members.approve(id, user.id);
  }

  @Post('members/:id/reject')
  @HttpCode(200)
  reject(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: unknown }) {
    return this.members.reject(id, body?.reason);
  }

  @Post('members/:id/suspend')
  @HttpCode(200)
  suspend(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: unknown }) {
    return this.members.setStatus(id, 'suspend', body?.reason);
  }

  @Post('members/:id/reactivate')
  @HttpCode(200)
  reactivate(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: unknown }) {
    return this.members.setStatus(id, 'reactivate', body?.reason);
  }

  @Post('members/:id/deactivate')
  @HttpCode(200)
  deactivate(@Param('id', ParseIntPipe) id: number, @Body() body: { reason?: unknown }) {
    return this.members.setStatus(id, 'deactivate', body?.reason);
  }

  @Post('members/:id/reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.members.resetPassword(id);
  }

  @Delete('members/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.members.remove(id);
  }

  @Get('members/:id/tracker')
  getTracker(@Param('id', ParseIntPipe) id: number, @Query('year') year?: string) {
    return this.tracker.get(id, Number(year) || new Date().getFullYear());
  }

  @Put('members/:id/tracker')
  saveTracker(@Param('id', ParseIntPipe) id: number, @Body() body: { year?: unknown; lots?: unknown; cells?: unknown }, @CurrentUser() user: AuthenticatedUser) {
    return this.tracker.save(id, body, user.id);
  }

  @Get('wallet')
  wallet(@Query() q: { page?: string }) {
    return this.payments.walletSummary(q);
  }

  @Post('wallet/payout')
  @HttpCode(200)
  payout(@Body() body: { amount?: unknown; channelId?: unknown; description?: unknown }, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.payout(body, user.id);
  }
}

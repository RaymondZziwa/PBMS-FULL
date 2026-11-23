import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { ClubAdminController, ClubMemberController, ClubPublicController } from './club.controller';
import { ClubAuthGuard } from './club-auth';
import { ClubMembersService } from './club-members.service';
import { ClubNotifyService } from './club-notify.service';
import { ClubPaymentsService } from './club-payments.service';
import { ClubTrackerService } from './club-tracker.service';
import { ClubShopService } from './club-shop.service';

/** Amatugunda Monk Club (Monk Loyalty Club): member applications, sign-in, tracker, payments and wallet. */
@Module({
  imports: [ConfigModule, HttpModule, PrismaModule, MailModule, JwtModule.register({})],
  controllers: [ClubPublicController, ClubMemberController, ClubAdminController],
  providers: [ClubMembersService, ClubTrackerService, ClubPaymentsService, ClubNotifyService, ClubShopService, ClubAuthGuard],
})
export class ClubModule {}

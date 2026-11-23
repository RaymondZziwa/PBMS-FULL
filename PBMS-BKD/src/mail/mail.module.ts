import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { MailService } from './mail.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

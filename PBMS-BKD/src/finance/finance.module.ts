// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WalletController } from './wallets/wallet.controller';
import { ChannelController } from './withdraw-channels/channel.controller';
import { WalletService } from './wallets/wallet.service';
import { ChannelService } from './withdraw-channels/channel.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WalletController, ChannelController],
  providers: [JwtService, WalletService, ChannelService],
})
export class FinanceModule {}

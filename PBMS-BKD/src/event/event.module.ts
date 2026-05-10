// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsController } from './event.controller';
import { EventsService } from './event.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [EventsController],
  providers: [EventsService, JwtService],
})
export class EventsModule {}

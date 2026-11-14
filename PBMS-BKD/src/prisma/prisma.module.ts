import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global so the whole app shares ONE PrismaClient (one connection pool).
// Do NOT add PrismaService to any other module's `providers` — that creates
// a new PrismaClient with its own pool and exhausts MySQL connections.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

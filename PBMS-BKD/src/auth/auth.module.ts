// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from 'src/mail/mail.service';
import { JwtRefreshStrategy } from 'src/guards/jwt-refresh.strategy';
import { JwtStrategy } from 'src/guards/jwt.strategy';
import { HttpModule } from '@nestjs/axios';
import { PasswordResetService } from './passwordReset.service';
import { requireSecret } from './jwtSecrets';

@Module({
  imports: [
    PassportModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: requireSecret(configService, 'JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    ConfigModule, // Make sure ConfigModule is imported
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    JwtStrategy,
    JwtRefreshStrategy,
    MailService,
  ],
  exports: [AuthService],
})
export class AuthModule {}

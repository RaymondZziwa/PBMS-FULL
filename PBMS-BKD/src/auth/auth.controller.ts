// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  UseGuards,
  Get,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthDto } from 'src/dto/auth.dto';
import { Public } from './decorators';
import { RefreshAuthGuard } from 'src/guards/refreshTokenGuard.guard';
import { PasswordResetService } from './passwordReset.service';
import {
  CompleteResetDto,
  RequestResetCodeDto,
  VerifyResetCodeDto,
} from 'src/dto/forgotPwd.dto';

const strictValidation = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
});

// Define the user type that matches what your guards return
interface AuthUser {
  id: number;
  // Add other properties that your JWT payload contains
  email?: string;
  firstName?: string;
  lastName?: string;
}

// Extend the Express Request type
declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private passwordResetService: PasswordResetService,
  ) {}

  /**
   * Password reset, step 1: send a 6-digit code by email or SMS.
   * Always answers the same way so it can't be used to find accounts.
   */
  @HttpCode(200)
  @Public()
  @Post('forgot-password')
  @UsePipes(strictValidation)
  requestPasswordReset(@Body() dto: RequestResetCodeDto) {
    return this.passwordResetService.requestCode(dto);
  }

  /** Password reset, step 2: check the code, get a 15-minute reset token. */
  @HttpCode(200)
  @Public()
  @Post('forgot-password/verify')
  @UsePipes(strictValidation)
  verifyPasswordResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.passwordResetService.verifyCode(dto);
  }

  /** Password reset, step 3: save the new password (token is single-use). */
  @HttpCode(200)
  @Public()
  @Post('forgot-password/reset')
  @UsePipes(strictValidation)
  completePasswordReset(@Body() dto: CompleteResetDto) {
    return this.passwordResetService.completeReset(dto);
  }

  @HttpCode(200)
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: AuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResult = await this.authService.login(loginDto);
    const { token, ...userData } = authResult;

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedHttps =
      typeof forwardedProto === 'string'
        ? forwardedProto.includes('https')
        : false;

    const origin = req.headers.origin;
    const isHttpsOrigin =
      typeof origin === 'string' ? origin.startsWith('https://') : false;

    const isHttpsRequest = req.secure || isForwardedHttps;
    const useCrossSiteCookies = [
      isHttpsRequest,
      process.env.NODE_ENV === 'production',
      isHttpsOrigin,
    ].some(Boolean);

    const sameSite: 'none' | 'lax' = useCrossSiteCookies ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: useCrossSiteCookies,
      sameSite,
    };

    // Set HTTP-only cookies
    res.cookie('accessToken', token.accessToken, {
      ...cookieOptions,
      maxAge: 86400000, // 1 day
    });

    res.cookie('refreshToken', token.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 86400000, // 7 days
    });

    // Remove tokens from the response since they're in cookies
    return {
      message: 'Login successful',
      user: userData,
    };
  }

  @HttpCode(200)
  @Public()
  @Post('pbd/login')
  async Pbdlogin(
    @Body() loginDto: AuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResult = await this.authService.pbdLogin(loginDto);
    const { token, ...userData } = authResult;

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedHttps =
      typeof forwardedProto === 'string'
        ? forwardedProto.includes('https')
        : false;

    const origin = req.headers.origin;
    const isHttpsOrigin =
      typeof origin === 'string' ? origin.startsWith('https://') : false;

    const isHttpsRequest = req.secure || isForwardedHttps;
    const useCrossSiteCookies =
      isHttpsRequest ||
      process.env.NODE_ENV === 'production' ||
      isHttpsOrigin;

    const sameSite: 'none' | 'lax' = useCrossSiteCookies ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: useCrossSiteCookies,
      sameSite,
    };

    // Set HTTP-only cookies
    res.cookie('accessToken', token.accessToken, {
      ...cookieOptions,
      maxAge: 86400000, // 1 day
    });

    res.cookie('refreshToken', token.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 86400000, // 7 days
    });

    // Remove tokens from the response since they're in cookies
    return {
      message: 'Login successful',
      user: userData,
    };
  }

  @Get('verify')
  verifyAuth(@Req() req: Request) {
    // If JwtAuthGuard passes, the user is authenticated
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return {
      status: 200,
      message: 'Authentication valid',
      data: {
        isValid: true,
        user: req.user,
      },
    };
  }

  /**
   * Get current authenticated user's complete profile
   */
  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = await this.authService.getCurrentUser(req.user.id);
    return {
      status: 200,
      message: 'User data retrieved successfully',
      data: user,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  @Public()
  @Post('refresh')
  @UseGuards(RefreshAuthGuard)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const newTokens = await this.authService.refreshTokens(req.user.id);

    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedHttps =
      typeof forwardedProto === 'string'
        ? forwardedProto.includes('https')
        : false;

    const origin = req.headers.origin;
    const isHttpsOrigin =
      typeof origin === 'string' ? origin.startsWith('https://') : false;

    const isHttpsRequest = req.secure || isForwardedHttps;
    const useCrossSiteCookies =
      isHttpsRequest
      || process.env.NODE_ENV === 'production'
      || isHttpsOrigin;

    const sameSite: 'none' | 'lax' = useCrossSiteCookies ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: useCrossSiteCookies,
      sameSite,
    };

    // Set new HTTP-only cookies
    res.cookie('accessToken', newTokens.accessToken, {
      ...cookieOptions,
      maxAge: 86400000, // 1 day
    });

    res.cookie('refreshToken', newTokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 86400000, // 7 days
    });

    return {
      status: 200,
      message: 'Tokens refreshed successfully',
    };
  }

  /**
   * Logout - clear cookies
   */
  @Public()
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedHttps =
      typeof forwardedProto === 'string'
        ? forwardedProto.includes('https')
        : false;

    const origin = req.headers.origin;
    const isHttpsOrigin =
      typeof origin === 'string' ? origin.startsWith('https://') : false;

    const isHttpsRequest = req.secure || isForwardedHttps;
    const useCrossSiteCookies =
      isHttpsRequest || process.env.NODE_ENV === 'production' ||
      isHttpsOrigin;

    const sameSite: 'none' | 'lax' = useCrossSiteCookies ? 'none' : 'lax';
    const cookieOptions = {
      httpOnly: true,
      secure: useCrossSiteCookies,
      sameSite,
    };

    // Clear the HTTP-only cookies
    res.cookie('accessToken', '', {
      ...cookieOptions,
      maxAge: 0, // Expire immediately
    });

    res.cookie('refreshToken', '', {
      ...cookieOptions,
      maxAge: 0, // Expire immediately
    });

    return {
      status: 200,
      message: 'Logout successful',
    };
  }
}

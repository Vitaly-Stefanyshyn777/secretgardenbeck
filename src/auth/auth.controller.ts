import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { SignupInput } from './dto/signup.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import {
  ResetPasswordDto,
  SetPasswordDto,
  ValidateResetCodeDto,
} from './dto/reset-password.dto';
import { Token } from './models/token.model';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, type: Token })
  async signup(@Body() data: SignupInput): Promise<Token> {
    data.email = data.email.toLowerCase();
    const { accessToken, refreshToken } = await this.authService.createUser(
      data,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in user' })
  @ApiResponse({ status: 200, type: Token })
  async login(@Body() data: LoginInput): Promise<Token> {
    const { accessToken, refreshToken } = await this.authService.login(
      {
        email: data.email?.toLowerCase(),
        phone: data.phone,
      },
      data.password,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT tokens' })
  @ApiResponse({ status: 200, type: Token })
  async refresh(@Body() { token }: RefreshTokenInput): Promise<Token> {
    return this.authService.refreshToken(token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset code to email' })
  async resetPassword(@Body() { email }: ResetPasswordDto) {
    await this.authService.requestPasswordReset(email);
    return { ok: true };
  }

  @Post('validate-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate password reset code' })
  async validateCode(@Body() { email, code }: ValidateResetCodeDto) {
    await this.authService.validateResetCode(email, code);
    return { ok: true };
  }

  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set new password using reset code' })
  async setPassword(@Body() { email, code, password }: SetPasswordDto) {
    await this.authService.setPasswordWithCode(email, code, password);
    return { ok: true };
  }
}


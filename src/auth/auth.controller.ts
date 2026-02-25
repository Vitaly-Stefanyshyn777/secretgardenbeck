import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { SignupInput } from './dto/signup.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
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
  async login(@Body() { email, password }: LoginInput): Promise<Token> {
    const { accessToken, refreshToken } = await this.authService.login(
      email.toLowerCase(),
      password,
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
}


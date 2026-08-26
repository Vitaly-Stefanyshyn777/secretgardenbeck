import { PrismaService } from 'nestjs-prisma';
import { Prisma, User } from '@prisma/client';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from './password.service';
import { SignupInput } from './dto/signup.input';
import { Token } from './models/token.model';
import { SecurityConfig } from '../common/configs/config.interface';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async createUser(payload: SignupInput): Promise<Token> {
    const hashedPassword = await this.passwordService.hashPassword(
      payload.password,
    );

    try {
      const user = await this.prisma.user.create({
        data: {
          ...payload,
          password: hashedPassword,
          role: 'USER',
        },
      });

      return this.generateTokens({
        userId: user.id,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(`Email ${payload.email} already used.`);
      }
      throw new Error(e);
    }
  }

  async login(
    identifier: { email?: string; phone?: string },
    password: string,
  ): Promise<Token> {
    const email = identifier.email?.toLowerCase().trim();
    const phone = identifier.phone?.replace(/\s+/g, '').trim();

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : await this.prisma.user.findFirst({
          where: {
            OR: [
              { phone },
              { phone: phone?.replace(/^\+/, '') },
              { phone: phone?.startsWith('+') ? phone : `+${phone}` },
            ],
          },
        });

    if (!user) {
      throw new NotFoundException(
        email
          ? `No user found for email: ${email}`
          : `No user found for phone: ${phone}`,
      );
    }

    const passwordValid = await this.passwordService.validatePassword(
      password,
      user.password,
    );

    if (!passwordValid) {
      throw new BadRequestException('Invalid password');
    }

    return this.generateTokens({
      userId: user.id,
    });
  }

  validateUser(userId: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  getUserFromToken(token: string): Promise<User> {
    const id = this.jwtService.decode(token)['userId'];
    return this.prisma.user.findUnique({ where: { id } });
  }

  generateTokens(payload: { userId: string }): Token {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  private generateAccessToken(payload: { userId: string }): string {
    return this.jwtService.sign(payload);
  }

  private generateRefreshToken(payload: { userId: string }): string {
    const securityConfig = this.configService.get<SecurityConfig>('security');
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: securityConfig.refreshIn,
    });
  }

  refreshToken(token: string) {
    try {
      const { userId } = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      return this.generateTokens({
        userId,
      });
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user) {
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.passwordReset.deleteMany({
      where: { email: normalized },
    });
    await this.prisma.passwordReset.create({
      data: { email: normalized, code, expiresAt },
    });

    await this.mailService.sendPasswordResetCode(normalized, code);
  }

  async validateResetCode(email: string, code: string): Promise<void> {
    await this.findValidPasswordReset(email, code);
  }

  async setPasswordWithCode(
    email: string,
    code: string,
    password: string,
  ): Promise<void> {
    const normalized = email.toLowerCase().trim();
    await this.findValidPasswordReset(normalized, code);

    const hashedPassword = await this.passwordService.hashPassword(password);
    await this.prisma.user.update({
      where: { email: normalized },
      data: { password: hashedPassword },
    });
    await this.prisma.passwordReset.deleteMany({
      where: { email: normalized },
    });
  }

  private async findValidPasswordReset(email: string, code: string) {
    const normalized = email.toLowerCase().trim();
    const record = await this.prisma.passwordReset.findFirst({
      where: { email: normalized, code: code.trim() },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired code');
    }

    return record;
  }
}

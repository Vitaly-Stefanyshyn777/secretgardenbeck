import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserInput } from './dto/update-user.input';
import { UpdateAgeVerificationDto } from './dto/update-age-verification.dto';
import { User } from './models/user.model';
import { ChangePasswordInput } from './dto/change-password.input';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@Req() req: any): User {
    return req.user;
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@Req() req: any, @Body() data: UpdateUserInput): Promise<User> {
    return this.usersService.updateUser(req.user.id, data);
  }

  @Patch('age-verification')
  @ApiOperation({ summary: 'Save age verification status (18+)' })
  updateAgeVerification(
    @Req() req: any,
    @Body() data: UpdateAgeVerificationDto,
  ): Promise<User> {
    return this.usersService.updateAgeVerified(req.user.id, data.verified);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(
    @Req() req: any,
    @Body() data: ChangePasswordInput,
  ): Promise<User> {
    return this.usersService.changePassword(
      req.user.id,
      req.user.password,
      data,
    );
  }
}


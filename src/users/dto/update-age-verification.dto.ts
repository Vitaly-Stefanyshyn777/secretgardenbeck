import { IsBoolean } from 'class-validator';

export class UpdateAgeVerificationDto {
  @IsBoolean()
  verified: boolean;
}

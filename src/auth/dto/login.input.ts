import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @Field({ nullable: true })
  @ValidateIf((o: LoginInput) => !o.phone)
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @ValidateIf((o: LoginInput) => !o.email)
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

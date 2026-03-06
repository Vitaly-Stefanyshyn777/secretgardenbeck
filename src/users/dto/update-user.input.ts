import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsPhoneNumber } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  firstname?: string;

  @Field({ nullable: true })
  @IsOptional()
  lastname?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsPhoneNumber('UA')
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  instagram?: string;

  @Field({ nullable: true })
  @IsOptional()
  telegram?: string;
}

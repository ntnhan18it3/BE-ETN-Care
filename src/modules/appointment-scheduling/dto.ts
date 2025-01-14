import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RegistrationDto {
  @IsString()
  @IsOptional()
  doctorId: string;

  @IsString()
  @IsOptional()
  userId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNumber()
  @IsOptional()
  service: number;

  @IsString()
  @IsOptional()
  note: string;

  @IsString()
  @IsOptional()
  date: string;

  @IsNumber()
  @IsOptional()
  session: number;

  @IsNumber()
  @IsOptional()
  from: number;

  @IsNumber()
  @IsOptional()
  to: number;

  @IsString()
  @IsOptional()
  room: string;
}

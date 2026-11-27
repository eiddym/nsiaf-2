import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RolUsuario } from '@prisma/client';

export class RegisterUserDto {
  @ApiProperty({ example: '12345678', description: 'Cédula de Identidad' })
  @IsNotEmpty()
  @IsString()
  ci!: string;

  @ApiProperty({ example: 'jdoe', description: 'Nombre de usuario' })
  @IsNotEmpty()
  @IsString()
  username!: string;

  @ApiProperty({ example: 'password123', description: 'Contraseña' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Juan', description: 'Nombres del funcionario' })
  @IsNotEmpty()
  @IsString()
  nombres!: string;

  @ApiProperty({ example: 'Pérez López', description: 'Apellidos del funcionario' })
  @IsNotEmpty()
  @IsString()
  apellidos!: string;

  @ApiPropertyOptional({ example: 'juan.perez@entidad.bo', description: 'Correo electrónico' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Responsable de Sistemas', description: 'Cargo oficial' })
  @IsOptional()
  @IsString()
  cargo?: string;

  @ApiPropertyOptional({ example: '71234567', description: 'Teléfono de contacto' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ enum: RolUsuario, default: RolUsuario.FUNCIONARIO })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ description: 'ID de la Unidad a la que pertenece' })
  @IsOptional()
  @IsString()
  unidadId?: string;
}

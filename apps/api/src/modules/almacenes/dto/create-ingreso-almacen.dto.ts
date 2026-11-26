import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { TipoIngreso } from '@prisma/client';

export class DetalleIngresoItemDto {
  @ApiProperty({ description: 'ID del Subartículo' })
  @IsNotEmpty()
  @IsString()
  subarticuloId!: string;

  @ApiProperty({ example: 50, description: 'Cantidad ingresada' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ example: 32.50, description: 'Costo unitario en Bs.' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  costoUnitario!: number;
}

export class CreateIngresoAlmacenDto {
  @ApiProperty({ example: '2026-10-27', description: 'Fecha de ingreso (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  fecha!: string;

  @ApiPropertyOptional({ enum: TipoIngreso, default: TipoIngreso.COMPRA })
  @IsOptional()
  @IsEnum(TipoIngreso)
  tipoIngreso?: TipoIngreso;

  @ApiPropertyOptional({ description: 'ID del Proveedor' })
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @ApiPropertyOptional({ example: 'FAC-9912' })
  @IsOptional()
  @IsString()
  facturaNumero?: string;

  @ApiPropertyOptional({ example: '2026-10-26' })
  @IsOptional()
  @IsDateString()
  facturaFecha?: string;

  @ApiPropertyOptional({ example: 'NE-892' })
  @IsOptional()
  @IsString()
  notaEntregaNumero?: string;

  @ApiPropertyOptional({ example: 'C31-2026-0155' })
  @IsOptional()
  @IsString()
  nroC31?: string;

  @ApiPropertyOptional({ example: 'ADSIB-ALM-CITE-2026-0045' })
  @IsOptional()
  @IsString()
  documentoCite?: string;

  @ApiPropertyOptional({ example: 'Ministerio de la Presidencia / Donación' })
  @IsOptional()
  @IsString()
  entidadDonante?: string;

  @ApiPropertyOptional({ example: 'Ingreso mensual de resmas de papel y tóner' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiProperty({ type: [DetalleIngresoItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleIngresoItemDto)
  detalles!: DetalleIngresoItemDto[];
}

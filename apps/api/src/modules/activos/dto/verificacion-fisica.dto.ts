import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { EstadoActivo } from '@prisma/client';

export enum EstadoVigenciaVerificacion {
  VIGENTE = 'VIGENTE',
  PROPUESTO_BAJA = 'PROPUESTO_BAJA',
  EN_REVISION = 'EN_REVISION',
}

export class VerificacionFisicaDto {
  @ApiProperty({ description: 'ID o Código de Barras / QR del Activo', example: 'ENT-12400-0001' })
  @IsNotEmpty()
  @IsString()
  identificador: string;

  @ApiProperty({ enum: EstadoActivo, description: 'Estado físico del bien', example: 'BUENO' })
  @IsNotEmpty()
  @IsEnum(EstadoActivo)
  estado: EstadoActivo;

  @ApiProperty({ enum: EstadoVigenciaVerificacion, description: 'Condición de vigencia operativa', example: 'VIGENTE' })
  @IsNotEmpty()
  @IsEnum(EstadoVigenciaVerificacion)
  estadoVigencia: EstadoVigenciaVerificacion;

  @ApiPropertyOptional({ description: 'Observaciones de campo por personal de activos', example: 'Verificado físicamente en oficina central. Operativo.' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({ description: 'Ubicación física confirmada', example: 'Piso 2 - Dirección Ejecutiva' })
  @IsOptional()
  @IsString()
  ubicacionFisica?: string;

  @ApiPropertyOptional({ description: 'Nombre o cargo del funcionario verificador', example: 'Lic. Carla Gómez (Activos Fijos)' })
  @IsOptional()
  @IsString()
  verificador?: string;
}

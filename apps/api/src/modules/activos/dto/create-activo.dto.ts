import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { EstadoActivo } from '@prisma/client';

export class CreateActivoDto {
  @ApiProperty({ example: 'ENT-12400-0003', description: 'Código de barras único del activo' })
  @IsNotEmpty()
  @IsString()
  codigoBarras!: string;

  @ApiProperty({ example: 'Monitor Dell UltraSharp 27 pulg 4K', description: 'Descripción principal' })
  @IsNotEmpty()
  @IsString()
  descripcion!: string;

  @ApiPropertyOptional({ example: 'Panel IPS con base ajustable y cable USB-C' })
  @IsOptional()
  @IsString()
  detalle?: string;

  @ApiPropertyOptional({ example: 'DELL' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'U2723QE' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ example: 'CN-08R212-WS3' })
  @IsOptional()
  @IsString()
  serie?: string;

  @ApiPropertyOptional({ example: 'Negro / Plata' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Plástico y aluminio' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: '61 x 38 x 18 cm' })
  @IsOptional()
  @IsString()
  medidas?: string;

  @ApiPropertyOptional({ enum: EstadoActivo, default: EstadoActivo.BUENO })
  @IsOptional()
  @IsEnum(EstadoActivo)
  estado?: EstadoActivo;

  @ApiProperty({ example: 4500.0, description: 'Precio de adquisición en Bolivianos' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  precioInicial!: number;

  @ApiPropertyOptional({ example: 1.0, default: 1.0 })
  @IsOptional()
  @IsNumber()
  valorResidual?: number;

  @ApiPropertyOptional({ example: 48, description: 'Vida útil restante en meses' })
  @IsOptional()
  @IsNumber()
  vidaUtilRestanteMeses?: number;

  @ApiProperty({ description: 'ID de la Cuenta Contable (ej: 12400)' })
  @IsNotEmpty()
  @IsString()
  cuentaContableId!: string;

  @ApiProperty({ description: 'ID del Auxiliar Contable' })
  @IsNotEmpty()
  @IsString()
  auxiliarId!: string;

  @ApiPropertyOptional({ description: 'ID del usuario custodio asignado' })
  @IsOptional()
  @IsString()
  usuarioCustodioId?: string;

  @ApiPropertyOptional({ example: 'Piso 4 - Dirección de Tecnologías' })
  @IsOptional()
  @IsString()
  ubicacion?: string;

  @ApiPropertyOptional({ description: 'ID del Ingreso de Activo asociado' })
  @IsOptional()
  @IsString()
  ingresoId?: string;
}

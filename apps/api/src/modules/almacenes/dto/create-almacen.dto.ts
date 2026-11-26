import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAlmacenDto {
  @ApiProperty({ example: 'SUB-ORURO', description: 'Código único del almacén' })
  @IsNotEmpty()
  @IsString()
  codigo!: string;

  @ApiProperty({ example: 'Sub-Almacén Sucursal Oruro', description: 'Nombre descriptivo' })
  @IsNotEmpty()
  @IsString()
  nombre!: string;

  @ApiPropertyOptional({ example: 'Calle 6 de Octubre esq. Bolívar, Sucursal Oruro' })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional({ default: false, description: 'True si es almacén central, False si es sub-almacén sucursal dependiente' })
  @IsOptional()
  @IsBoolean()
  esCentral?: boolean;

  @ApiPropertyOptional({ description: 'ID del almacén central padre del cual depende este sub-almacén' })
  @IsOptional()
  @IsString()
  almacenPadreId?: string;

  @ApiPropertyOptional({ description: 'ID del Edificio o Sucursal' })
  @IsOptional()
  @IsString()
  edificioId?: string;

  @ApiPropertyOptional({ description: 'ID del usuario responsable a cargo de este almacén' })
  @IsOptional()
  @IsString()
  responsableId?: string;
}

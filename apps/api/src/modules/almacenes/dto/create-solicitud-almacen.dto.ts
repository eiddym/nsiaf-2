import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class DetalleSolicitudItemDto {
  @ApiProperty({ description: 'ID del Subartículo solicitado' })
  @IsNotEmpty()
  @IsString()
  subarticuloId!: string;

  @ApiProperty({ example: 2, description: 'Cantidad solicitada' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cantidadSolicitada!: number;
}

export class CreateSolicitudAlmacenDto {
  @ApiPropertyOptional({ example: 'ADSIB-SOL-2026-0012', description: 'Cite oficial vinculado si existe' })
  @IsOptional()
  @IsString()
  documentoCite?: string;

  @ApiPropertyOptional({ example: 'Solicitud de material para la preparación de talleres de capacitación' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiProperty({ type: [DetalleSolicitudItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleSolicitudItemDto)
  detalles!: DetalleSolicitudItemDto[];
}

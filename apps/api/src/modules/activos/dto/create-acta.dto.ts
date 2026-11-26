import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipoActa } from '@prisma/client';

export class CreateActaDto {
  @ApiProperty({ enum: TipoActa, example: TipoActa.ENTREGA })
  @IsNotEmpty()
  @IsEnum(TipoActa)
  tipo!: TipoActa;

  @ApiProperty({ description: 'ID del funcionario beneficiario/responsable que recibe o entrega el bien' })
  @IsNotEmpty()
  @IsString()
  usuarioFuncionarioId!: string;

  @ApiPropertyOptional({ example: 'ADSIB-ACTA-2026-0091', description: 'Código CITE oficial vinculado de Plantillas' })
  @IsOptional()
  @IsString()
  documentoCite?: string;

  @ApiPropertyOptional({ example: 'Entrega de equipamiento para cumplimiento de funciones en oficina central' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ type: [String], description: 'Lista de IDs de activos a incluir en el acta' })
  @IsArray()
  @IsString({ each: true })
  activoIds!: string[];
}

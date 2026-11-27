import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class ItemTraspasoDto {
  @ApiProperty({ description: 'ID del Subartículo a transferir' })
  @IsNotEmpty()
  @IsString()
  subarticuloId!: string;

  @ApiProperty({ example: 10, description: 'Cantidad a transferir al sub-almacén' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cantidad!: number;
}

export class CreateTraspasoDto {
  @ApiProperty({ description: 'ID del Almacén Central de origen' })
  @IsNotEmpty()
  @IsString()
  almacenOrigenId!: string;

  @ApiProperty({ description: 'ID del Sub-almacén o sucursal de destino' })
  @IsNotEmpty()
  @IsString()
  almacenDestinoId!: string;

  @ApiPropertyOptional({ example: 'ENT-TRASP-2026-0005', description: 'CITE oficial de asignación de suministros' })
  @IsOptional()
  @IsString()
  documentoCite?: string;

  @ApiPropertyOptional({ example: 'Dotación mensual de material de escritorio para la sucursal' })
  @IsOptional()
  @IsString()
  motivo?: string;

  @ApiProperty({ type: [ItemTraspasoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemTraspasoDto)
  items!: ItemTraspasoDto[];
}

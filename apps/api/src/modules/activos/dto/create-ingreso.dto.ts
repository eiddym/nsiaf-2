import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { TipoIngreso, EstadoActivo } from '@prisma/client';

export class ItemIngresoActivoDto {
  @ApiProperty({ example: 'Silla Ergonómica Ejecutiva con Apoyo Lumbar' })
  @IsNotEmpty()
  @IsString()
  descripcion!: string;

  @ApiPropertyOptional({ example: 'Malla antitraspirante y ruedas siliconadas' })
  @IsOptional()
  @IsString()
  detalle?: string;

  @ApiPropertyOptional({ example: 'ComfortPro' })
  @IsOptional()
  @IsString()
  marca?: string;

  @ApiPropertyOptional({ example: 'ERGO-200' })
  @IsOptional()
  @IsString()
  modelo?: string;

  @ApiPropertyOptional({ example: 'Negro' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ example: 1250.0 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  precioUnitario!: number;

  @ApiProperty({ example: 5, description: 'Cantidad de unidades idénticas a registrar con códigos de barra correlativos' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  cantidad!: number;

  @ApiProperty({ description: 'ID de la Cuenta Contable' })
  @IsNotEmpty()
  @IsString()
  cuentaContableId!: string;

  @ApiProperty({ description: 'ID del Auxiliar Contable' })
  @IsNotEmpty()
  @IsString()
  auxiliarId!: string;

  @ApiPropertyOptional({ example: 'Piso 2 - Sala de Capacitación' })
  @IsOptional()
  @IsString()
  ubicacion?: string;
}

export class CreateIngresoActivoDto {
  @ApiProperty({ example: '2026-10-27', description: 'Fecha del ingreso (YYYY-MM-DD)' })
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

  @ApiPropertyOptional({ example: 'F-10293' })
  @IsOptional()
  @IsString()
  facturaNumero?: string;

  @ApiPropertyOptional({ example: '891029384910' })
  @IsOptional()
  @IsString()
  facturaAutorizacion?: string;

  @ApiPropertyOptional({ example: '2026-10-25' })
  @IsOptional()
  @IsDateString()
  facturaFecha?: string;

  @ApiPropertyOptional({ example: 'C31-2026-0089' })
  @IsOptional()
  @IsString()
  nroC31?: string;

  @ApiPropertyOptional({ example: 'NE-4421' })
  @IsOptional()
  @IsString()
  notaEntregaNumero?: string;

  @ApiPropertyOptional({ example: 'ADSIB-UAF-CITE-2026-0120' })
  @IsOptional()
  @IsString()
  documentoCite?: string;

  @ApiPropertyOptional({ example: 'Agencia de Cooperación Internacional / BID' })
  @IsOptional()
  @IsString()
  entidadDonante?: string;

  @ApiPropertyOptional({ example: 'Adquisición de sillas ergonómicas para nuevos puestos de trabajo' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiProperty({ type: [ItemIngresoActivoDto], description: 'Listado de ítems y cantidades a incorporar' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemIngresoActivoDto)
  items!: ItemIngresoActivoDto[];
}

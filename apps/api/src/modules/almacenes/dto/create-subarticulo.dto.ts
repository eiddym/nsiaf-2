import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateSubarticuloDto {
  @ApiProperty({ example: 30005, description: 'Código numérico único del subartículo' })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  codigo!: number;

  @ApiProperty({ example: 'Marcador para pizarra acrílica recargable' })
  @IsNotEmpty()
  @IsString()
  descripcion!: string;

  @ApiProperty({ example: 'Caja x 12' })
  @IsNotEmpty()
  @IsString()
  unidadMedida!: string;

  @ApiProperty({ description: 'ID del Material padre' })
  @IsNotEmpty()
  @IsString()
  materialId!: string;
}

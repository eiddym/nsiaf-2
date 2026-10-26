import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ActivosService } from './activos.service';

@ApiTags('Activos Fijos')
@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar activos con paginación y filtro de búsqueda' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.activosService.findAll(Number(page) || 1, Number(limit) || 20, search);
  }

  @Get('codigo-barras/:barcode')
  @ApiOperation({ summary: 'Buscar un activo específico por su código de barras' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.activosService.findByBarcode(barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle completo de un activo por ID' })
  findOne(@Param('id') id: string) {
    return this.activosService.findOne(id);
  }
}

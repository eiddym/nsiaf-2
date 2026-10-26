import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AlmacenesService } from './almacenes.service';

@ApiTags('Almacenes y Suministros')
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  @Get('subarticulos')
  @ApiOperation({ summary: 'Listar subartículos (suministros) con stock actual' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  listSubarticulos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.almacenesService.listSubarticulos(Number(page) || 1, Number(limit) || 20, search);
  }

  @Get('subarticulos/:id/kardex')
  @ApiOperation({ summary: 'Obtener kardex físico valorado de un subartículo' })
  getKardex(@Param('id') id: string) {
    return this.almacenesService.getKardex(id);
  }

  @Get('solicitudes')
  @ApiOperation({ summary: 'Listar solicitudes de suministros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listSolicitudes(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.almacenesService.listSolicitudes(Number(page) || 1, Number(limit) || 20);
  }
}

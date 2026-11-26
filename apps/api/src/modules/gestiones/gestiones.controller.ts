import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GestionesService, RegistrarUfvDto } from './gestiones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Gestiones Fiscales y UFVs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gestiones')
export class GestionesController {
  constructor(private readonly gestionesService: GestionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar gestiones fiscales y estado de cierre contable' })
  async listar() {
    return this.gestionesService.listarGestiones();
  }

  @Post()
  @ApiOperation({ summary: 'Aperturar nueva gestión fiscal' })
  async crear(@Body('anio', ParseIntPipe) anio: number) {
    return this.gestionesService.crearGestion(anio);
  }

  @Post(':anio/cerrar')
  @ApiOperation({ summary: 'Ejecutar el Cierre Anual de Gestión Contable con depreciación y UFV' })
  async cerrar(@Param('anio', ParseIntPipe) anio: number, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.gestionesService.cerrarGestion(anio, userId);
  }

  @Get('ufvs/historial')
  @ApiOperation({ summary: 'Listar cotizaciones diarias de la UFV' })
  async listarUfvs() {
    return this.gestionesService.listarUfvs();
  }

  @Post('ufvs')
  @ApiOperation({ summary: 'Registrar o actualizar cotización UFV para una fecha' })
  async registrarUfv(@Body() dto: RegistrarUfvDto) {
    return this.gestionesService.registrarUfv(dto);
  }
}

import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AlmacenesService } from './almacenes.service';
import { CreateSubarticuloDto } from './dto/create-subarticulo.dto';
import { CreateIngresoAlmacenDto } from './dto/create-ingreso-almacen.dto';
import { CreateSolicitudAlmacenDto } from './dto/create-solicitud-almacen.dto';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Almacenes y Suministros')
@Controller('almacenes')
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  // ==========================================
  // JERARQUÍA DE ALMACENES (CENTRAL Y SUB-ALMACENES)
  // ==========================================

  @Get()
  @ApiOperation({ summary: 'Listar Almacén Central y Sub-almacenes de sucursales con responsables' })
  listarAlmacenes() {
    return this.almacenesService.listarAlmacenes();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES, RolUsuario.AUXILIAR_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un Almacén Central o Sub-almacén sucursal dependiente' })
  crearAlmacen(@Body() dto: CreateAlmacenDto) {
    return this.almacenesService.crearAlmacen(dto);
  }

  @Get(':id/stocks')
  @ApiOperation({ summary: 'Consultar stocks y existencias físicas de un almacén o sub-almacén' })
  obtenerStocksPorAlmacen(@Param('id') id: string) {
    return this.almacenesService.obtenerStocksPorAlmacen(id);
  }

  @Post('traspasos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES, RolUsuario.AUXILIAR_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asignar inventario desde el Almacén Central hacia un Sub-almacén dependiente (Traspaso)' })
  @ApiResponse({ status: 201, description: 'Traspaso realizado e impacto en kardex en origen y destino' })
  crearTraspaso(@Body() dto: CreateTraspasoDto, @CurrentUser('id') userId: string) {
    return this.almacenesService.crearTraspaso(dto, userId);
  }

  @Get('traspasos/historial')
  @ApiOperation({ summary: 'Listar historial de traspasos entre almacenes' })
  listarTraspasos() {
    return this.almacenesService.listarTraspasos();
  }

  // ==========================================
  // SUMINISTROS Y KARDEX
  // ==========================================

  @Get('subarticulos')
  @ApiOperation({ summary: 'Listar subartículos (suministros) con stock desglosado por almacén' })
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

  @Post('subarticulos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES, RolUsuario.AUXILIAR_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar un nuevo subartículo en el catálogo de suministros' })
  createSubarticulo(@Body() dto: CreateSubarticuloDto) {
    return this.almacenesService.createSubarticulo(dto);
  }

  @Get('subarticulos/:id/kardex')
  @ApiOperation({ summary: 'Obtener kardex físico-valorado (opcionalmente filtrado por almacén)' })
  @ApiQuery({ name: 'almacenId', required: false, type: String })
  getKardex(@Param('id') id: string, @Query('almacenId') almacenId?: string) {
    return this.almacenesService.getKardex(id, almacenId);
  }

  @Post('ingresos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES, RolUsuario.AUXILIAR_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar Nota de Ingreso / Compra en Almacén e impacto en Kardex' })
  createIngreso(@Body() dto: CreateIngresoAlmacenDto, @CurrentUser('id') userId: string) {
    return this.almacenesService.createIngreso(dto, userId);
  }

  @Get('solicitudes')
  @ApiOperation({ summary: 'Listar solicitudes de suministros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listSolicitudes(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.almacenesService.listSolicitudes(Number(page) || 1, Number(limit) || 20);
  }

  @Post('solicitudes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear solicitud de pedidos de almacén (Cualquier funcionario autenticado)' })
  createSolicitud(@Body() dto: CreateSolicitudAlmacenDto, @CurrentUser('id') userId: string) {
    return this.almacenesService.createSolicitud(dto, userId);
  }

  @Get('materiales')
  @ApiOperation({ summary: 'Listar catálogo de materiales / partidas presupuestarias Grupo 30000' })
  listarMateriales() {
    return this.almacenesService.listarMateriales();
  }

  @Post('materiales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nuevo grupo de material / partida presupuestaria' })
  crearMaterial(@Body() dto: { codigo: string; descripcion: string }) {
    return this.almacenesService.crearMaterial(dto);
  }

  @Put('subarticulos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos de un subartículo del catálogo' })
  actualizarSubarticulo(
    @Param('id') id: string,
    @Body() dto: { descripcion?: string; unidadMedida?: string; materialId?: string; activo?: boolean },
  ) {
    return this.almacenesService.actualizarSubarticulo(id, dto);
  }

  @Get('ingresos')
  @ApiOperation({ summary: 'Listar historial de notas de ingreso a almacenes' })
  listarIngresos(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.almacenesService.listarIngresos(Number(page) || 1, Number(limit) || 30);
  }

  @Post('solicitudes/:id/entregar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES, RolUsuario.AUXILIAR_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar y entregar pedido de almacén (descuenta stock y genera Kardex SALIDA)' })
  entregarSolicitud(@Param('id') id: string) {
    return this.almacenesService.entregarSolicitud(id);
  }

  @Post('solicitudes/:id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechazar o anular una solicitud pendiente de almacén' })
  rechazarSolicitud(@Param('id') id: string, @Body('motivo') motivo?: string) {
    return this.almacenesService.rechazarSolicitud(id, motivo);
  }
}

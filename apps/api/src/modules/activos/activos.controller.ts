import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { CreateIngresoActivoDto } from './dto/create-ingreso.dto';
import { CreateActaDto } from './dto/create-acta.dto';
import { VerificacionFisicaDto } from './dto/verificacion-fisica.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';

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

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener métricas y estadísticas globales de activos fijos' })
  getEstadisticas() {
    return this.activosService.getEstadisticas();
  }

  @Get('actas')
  @ApiOperation({ summary: 'Listar actas generadas (Entrega, Devolución, Transferencia)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listActas(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.activosService.listActas(Number(page) || 1, Number(limit) || 20);
  }

  @Get('cuentas')
  @ApiOperation({ summary: 'Listar cuentas contables (Grupo 40000) y sus auxiliares' })
  listarCuentas() {
    return this.activosService.listarCuentasContables();
  }

  @Post('cuentas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar una nueva cuenta contable / rubro de activo fijo' })
  crearCuenta(
    @Body() dto: { codigo: number; nombre: string; vidaUtilMeses: number; depreciar?: boolean; actualizar?: boolean },
  ) {
    return this.activosService.crearCuentaContable(dto);
  }

  @Post('cuentas/:id/auxiliares')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar un nuevo auxiliar contable bajo una cuenta' })
  crearAuxiliar(@Param('id') cuentaId: string, @Body() dto: { codigo: number; nombre: string }) {
    return this.activosService.crearAuxiliar(cuentaId, dto);
  }

  @Get('bajas')
  @ApiOperation({ summary: 'Listar histórico de actas de baja de activos fijos' })
  listarBajas() {
    return this.activosService.listarBajas();
  }

  @Post('bajas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar baja definitiva de uno o varios activos fijos' })
  registrarBaja(
    @Body() dto: { activoIds: string[]; motivo: string; documentoCite?: string; observacion?: string; fecha?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.activosService.registrarBaja(dto, userId);
  }

  @Get('solicitudes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar solicitudes de asignación/devolución enviadas por funcionarios' })
  listarSolicitudes(@Query('estado') estado?: string) {
    return this.activosService.listarSolicitudesActivos(estado);
  }

  @Patch('solicitudes/:id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar, entregar o rechazar una solicitud de activo fijo' })
  actualizarEstadoSolicitud(
    @Param('id') id: string,
    @Body() body: { estado: 'APROBADA' | 'ENTREGADA' | 'RECHAZADA' | 'ANULADA'; observacion?: string },
  ) {
    return this.activosService.actualizarEstadoSolicitudActivo(id, body.estado, body.observacion);
  }

  @Get('codigo-barras/:barcode')
  @ApiOperation({ summary: 'Buscar un activo específico por su código de barras o QR' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.activosService.findByBarcode(barcode);
  }

  @Get('verificar/:code')
  @ApiOperation({ summary: 'Verificación rápida pública de activo escaneado mediante Código QR' })
  verificarActivo(@Param('code') code: string) {
    return this.activosService.verificarActivo(code);
  }

  @Post('verificacion-fisica')
  @ApiOperation({ summary: 'Registrar verificación física en terreno de activo escaneado (vigencia, estado, observaciones)' })
  registrarVerificacionFisica(@Body() dto: VerificacionFisicaDto) {
    return this.activosService.registrarVerificacionFisica(dto.identificador, dto);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Obtener imagen DataURI del Código QR de identificación global del activo' })
  async getQrActivo(@Param('id') id: string) {
    const qrDataUrl = await this.activosService.generarQrActivo(id);
    return { qrDataUrl };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle completo de un activo por ID' })
  findOne(@Param('id') id: string) {
    return this.activosService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un nuevo activo fijo individual' })
  @ApiResponse({ status: 201, description: 'Activo creado correctamente' })
  create(@Body() dto: CreateActivoDto) {
    return this.activosService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar un activo fijo existente' })
  update(@Param('id') id: string, @Body() dto: UpdateActivoDto) {
    return this.activosService.update(id, dto);
  }

  @Post('ingreso')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar Nota de Ingreso y generación masiva de activos con códigos de barra' })
  @ApiResponse({ status: 201, description: 'Nota de ingreso y activos creados exitosamente' })
  createIngreso(@Body() dto: CreateIngresoActivoDto, @CurrentUser('id') userId: string) {
    return this.activosService.createIngreso(dto, userId);
  }

  @Post('acta')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generar Acta oficial (Entrega, Devolución, Transferencia) y actualizar custodia' })
  @ApiResponse({ status: 201, description: 'Acta generada y custodias actualizadas exitosamente' })
  createActa(@Body() dto: CreateActaDto, @CurrentUser('id') userId: string) {
    return this.activosService.createActa(dto, userId);
  }

  @Get('reportes/depreciacion')
  @ApiOperation({ summary: 'Reporte 10 vSIAF: Inventario y Depreciación con Actualización UFV' })
  @ApiQuery({ name: 'cuentaId', required: false, type: String })
  getReporteDepreciacion(@Query('cuentaId') cuentaId?: string) {
    return this.activosService.obtenerReporteDepreciacion(cuentaId);
  }

  @Get('reportes/resumen')
  @ApiOperation({ summary: 'Reporte 6 vSIAF: Resumen Consolidado de Activos Fijos por Rubro Contable' })
  getReporteResumen() {
    return this.activosService.obtenerReporteResumen();
  }

  @Get('reportes/bajas')
  @ApiOperation({ summary: 'Reporte 9 vSIAF: Bajas de Activos Fijos' })
  getReporteBajas() {
    return this.activosService.obtenerReporteBajas();
  }

  @Get('reportes/por-custodio/:usuarioId')
  @ApiOperation({ summary: 'Reporte Oficial de Activos Asignados por Funcionario Custodio' })
  getReportePorCustodio(@Param('usuarioId') usuarioId: string) {
    return this.activosService.obtenerActivosPorCustodio(usuarioId);
  }
}

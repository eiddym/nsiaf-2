import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InteropService } from './interop.service';

@ApiTags('Interoperabilidad Plantillas (API v2)')
@Controller()
export class InteropController {
  constructor(private readonly interopService: InteropService) {}

  // ------------------------------------------
  // ESTADO
  // ------------------------------------------
  @Get('api/v2/estado')
  @ApiOperation({ summary: 'Verificar disponibilidad del servicio para Plantillas' })
  getEstado() {
    return this.interopService.getEstado();
  }

  // ------------------------------------------
  // ALMACENES
  // ------------------------------------------
  @Get('api/v2/almacenes/articulos')
  @ApiOperation({ summary: 'Buscar suministros/artículos de almacén para Plantillas' })
  consultarArticulos(
    @Query('descripcion') descripcion?: string,
    @Query('todos') todos?: string,
  ) {
    return this.interopService.consultarArticulosAlmacen(descripcion, todos);
  }

  @Get('api/v2/almacenes/proveedores')
  @ApiOperation({ summary: 'Consultar catálogo de proveedores para almacén' })
  consultarProveedoresAlmacen(@Query('descripcion') descripcion?: string) {
    return this.interopService.consultarProveedoresAlmacen(descripcion);
  }

  @Post('api/v2/almacenes/solicitud')
  @HttpCode(200)
  @ApiOperation({ summary: 'Crear solicitud de pedido de almacén desde Plantillas' })
  crearSolicitud(@Body() body: any) {
    return this.interopService.crearSolicitudAlmacen(body);
  }

  @Get('api/v2/almacenes/solicitud')
  @ApiOperation({ summary: 'Recuperar entrega de solicitud de almacén para formulario EORMS' })
  recuperarSolicitud(@Query('id') id?: string) {
    return this.interopService.recuperarSolicitudAlmacen(id);
  }

  @Patch('api/v2/almacenes/solicitud')
  @HttpCode(200)
  @ApiOperation({ summary: 'Notificar entrega/actualización de almacén desde Plantillas' })
  notificarSolicitud(@Body() body: any) {
    return {
      finalizado: true,
      mensaje: 'Notificación de almacenes actualizada con éxito.',
    };
  }

  @Post('api/v2/almacenes/ingreso')
  @HttpCode(200)
  @ApiOperation({ summary: 'Registrar ingreso a almacén desde formulario IMS de Plantillas' })
  crearIngresoAlmacen(@Body() body: any) {
    return this.interopService.crearIngresoAlmacen(body);
  }

  // ------------------------------------------
  // ACTIVOS FIJOS
  // ------------------------------------------
  @Get('api/v2/activos/buscar')
  @ApiOperation({ summary: 'Búsqueda de activos por código/descripción para Plantillas' })
  buscarActivos(
    @Query('codigo') codigo?: string,
    @Query('descripcion') descripcion?: string,
    @Query('plantilla') plantilla?: string,
  ) {
    return this.interopService.buscarActivos(codigo, descripcion, plantilla);
  }

  @Get('api/v2/activos/usuario/:ci')
  @ApiOperation({ summary: 'Búsqueda de activos asignados por CI de funcionario' })
  buscarPorUsuario(
    @Param('ci') ci: string,
    @Query('responsable_ci') responsableCi?: string,
  ) {
    return this.interopService.buscarActivosPorUsuario(ci, responsableCi);
  }

  @Post('api/v2/activos/asignacion')
  @HttpCode(200)
  @ApiOperation({ summary: 'Asignación de activos desde formulario AODAF de Plantillas' })
  asignarActivos(@Body() body: any) {
    return this.interopService.asignarActivos(body);
  }

  @Post('api/v2/activos/devolucion')
  @HttpCode(200)
  @ApiOperation({ summary: 'Devolución de activos desde formulario AODAF de Plantillas' })
  devolverActivos(@Body() body: any) {
    return this.interopService.devolverActivos(body);
  }

  @Post(['api/v2/activos/ingreso', 'api/v2/activos/ingresar'])
  @HttpCode(200)
  @ApiOperation({ summary: 'Ingreso de activos fijos desde formulario IAF de Plantillas' })
  ingresarActivos(@Body() body: any) {
    return this.interopService.ingresarActivos(body);
  }

  @Post('api/v2/activos/baja')
  @HttpCode(200)
  @ApiOperation({ summary: 'Baja de activos fijos desde formulario BAF de Plantillas' })
  registrarBaja(@Body() body: any) {
    return this.interopService.registrarBajaActivos(body);
  }

  @Get('api/v2/activos/proveedores')
  @ApiOperation({ summary: 'Consultar proveedores para activos fijos' })
  consultarProveedoresActivos(@Query('descripcion') descripcion?: string) {
    return this.interopService.consultarProveedoresAlmacen(descripcion);
  }

  // ------------------------------------------
  // SOLICITANTES Y METADATOS JERÁRQUICOS
  // ------------------------------------------
  @Post('api/v2/solicitantes/sincronizar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sincronizar metadatos del solicitante (entidad, unidad, subunidad y jerarquía)' })
  sincronizarSolicitante(@Body() body: any) {
    return this.interopService.sincronizarSolicitantePlantillas(
      body.solicitante || body,
      body.metadata,
    );
  }

  @Get('api/v2/solicitantes/:ci')
  @ApiOperation({ summary: 'Consultar información jerárquica y organizacional del solicitante por CI' })
  consultarSolicitante(@Param('ci') ci: string) {
    return this.interopService.consultarSolicitantePorCi(ci);
  }
}

import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntidadesService } from './entidades.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Estructura Organizacional: Entidades e Instituciones')
@Controller('entidades')
export class EntidadesController {
  constructor(private readonly entidadesService: EntidadesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar entidades institucionales con sus instituciones / edificios hijas' })
  listarEntidades() {
    return this.entidadesService.listarEntidades();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una entidad y sus dependencias' })
  obtenerEntidad(@Param('id') id: string) {
    return this.entidadesService.obtenerEntidad(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar una nueva entidad institucional' })
  crearEntidad(
    @Body() dto: {
      codigo: string;
      nombre: string;
      sigla: string;
      encabezado?: string;
      piePagina?: string;
    },
  ) {
    return this.entidadesService.crearEntidad(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos de una entidad institucional' })
  actualizarEntidad(
    @Param('id') id: string,
    @Body() dto: {
      nombre?: string;
      sigla?: string;
      encabezado?: string;
      piePagina?: string;
    },
  ) {
    return this.entidadesService.actualizarEntidad(id, dto);
  }

  // --- Endpoints de Instituciones / Edificios Hijas ---

  @Get('instituciones/todas')
  @ApiOperation({ summary: 'Listar todas las instituciones / sucursales dependientes' })
  listarInstituciones(@Query('entidadId') entidadId?: string) {
    return this.entidadesService.listarInstituciones(entidadId);
  }

  @Post(':id/instituciones')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar una nueva institución/edificio hijo bajo una entidad' })
  crearInstitucion(
    @Param('id') entidadId: string,
    @Body() dto: {
      codigo: string;
      nombre: string;
      direccion?: string;
    },
  ) {
    return this.entidadesService.crearInstitucion(entidadId, dto);
  }

  @Put('instituciones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar institución / edificio hijo' })
  actualizarInstitucion(
    @Param('id') id: string,
    @Body() dto: {
      nombre?: string;
      direccion?: string;
    },
  ) {
    return this.entidadesService.actualizarInstitucion(id, dto);
  }

  @Delete('instituciones/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una institución si no tiene almacenes o unidades activas' })
  eliminarInstitucion(@Param('id') id: string) {
    return this.entidadesService.eliminarInstitucion(id);
  }
}

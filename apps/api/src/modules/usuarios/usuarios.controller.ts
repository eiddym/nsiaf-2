import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService, CreateUsuarioDto, UpdateUsuarioDto } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Administración: Usuarios y Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(
    RolUsuario.SUPER_ADMIN,
    RolUsuario.ADMIN_GENERAL,
    RolUsuario.ADMIN_ACTIVOS,
    RolUsuario.ADMIN_ALMACENES,
    RolUsuario.AUXILIAR_ACTIVOS,
    RolUsuario.AUXILIAR_ALMACENES,
  )
  @ApiOperation({ summary: 'Listar usuarios del sistema con filtros de búsqueda, rol, unidad y estado' })
  listar(
    @Query('search') search?: string,
    @Query('rol') rol?: RolUsuario,
    @Query('activo') activo?: string,
    @Query('unidadId') unidadId?: string,
  ) {
    return this.usuariosService.listar({ search, rol, activo, unidadId });
  }

  @Get('resumen')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Obtener métricas consolidadas de usuarios y distribución por rol' })
  resumen() {
    return this.usuariosService.obtenerResumen();
  }

  @Get('roles-disponibles')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Catálogo de roles del sistema y sus alcances operativos' })
  rolesDisponibles() {
    return this.usuariosService.getCatalogoRoles();
  }

  @Post()
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Crear nuevo usuario y asignar rol, unidad organizacional y accesos de módulo' })
  crear(@Body() dto: CreateUsuarioDto, @CurrentUser() actor: any) {
    return this.usuariosService.crear(dto, actor);
  }

  @Put(':id')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Actualizar datos, rol, jerarquía y permisos de módulos de un usuario' })
  actualizar(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser() actor: any) {
    return this.usuariosService.actualizar(id, dto, actor);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Activar o desactivar acceso de un usuario' })
  cambiarEstado(@Param('id') id: string, @Body('activo') activo: boolean, @CurrentUser() actor: any) {
    return this.usuariosService.cambiarEstado(id, activo, actor);
  }

  @Patch(':id/password')
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Restablecer contraseña de un usuario administrativamente' })
  resetearPassword(@Param('id') id: string, @Body('password') password: string, @CurrentUser() actor: any) {
    return this.usuariosService.resetearPassword(id, password, actor);
  }
}

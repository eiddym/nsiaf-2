import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfiguracionService, UpdateConfiguracionDto } from './configuracion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Configuración Sistema')
@Controller('configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Obtener configuración general, responsables de módulos y Authentik SSO' })
  @ApiResponse({ status: 200, description: 'Configuración actual del sistema y usuarios asignables' })
  getConfiguracion() {
    return this.configuracionService.getConfiguracion();
  }

  @Put()
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiOperation({ summary: 'Actualizar parámetros iniciales, responsables y modo unificado/descentralizado' })
  updateConfiguracion(@Body() dto: UpdateConfiguracionDto) {
    return this.configuracionService.updateConfiguracion(dto);
  }
}

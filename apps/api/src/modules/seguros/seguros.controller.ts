import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SegurosService, CreateSeguroDto, UpdateSeguroDto } from './seguros.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Seguros y Pólizas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.ADMIN_ACTIVOS, RolUsuario.AUXILIAR_ACTIVOS)
@Controller('seguros')
export class SegurosController {
  constructor(private readonly segurosService: SegurosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pólizas de seguro con estado y días restantes de vigencia' })
  async listar() {
    return this.segurosService.findAll();
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Obtener resumen de pólizas críticas por vencer (90, 30, 7 días) o vencidas' })
  async alertas() {
    return this.segurosService.obtenerAlertasVencimiento();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de póliza con activos asegurados' })
  async detalle(@Param('id') id: string) {
    return this.segurosService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva póliza de seguros para activos fijos' })
  async crear(@Body() dto: CreateSeguroDto) {
    return this.segurosService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de una póliza' })
  async actualizar(@Param('id') id: string, @Body() dto: UpdateSeguroDto) {
    return this.segurosService.update(id, dto);
  }

  @Post(':id/activos')
  @ApiOperation({ summary: 'Vincular lote de activos a una póliza existente' })
  async vincular(@Param('id') id: string, @Body() body: { activoIds: string[] }) {
    return this.segurosService.vincularActivos(id, body.activoIds);
  }

  @Delete(':id/activos/:activoId')
  @ApiOperation({ summary: 'Desvincular un activo de una póliza' })
  async desvincular(@Param('id') id: string, @Param('activoId') activoId: string) {
    return this.segurosService.desvincularActivo(id, activoId);
  }
}

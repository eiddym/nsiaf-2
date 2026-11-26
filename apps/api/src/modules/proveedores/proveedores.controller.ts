import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProveedoresService } from './proveedores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Proveedores y Contratistas')
@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar proveedores con búsqueda y paginación' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  listarProveedores(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.proveedoresService.listarProveedores(
      Number(page) || 1,
      Number(limit) || 50,
      search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener información y movimientos de un proveedor' })
  obtenerProveedor(@Param('id') id: string) {
    return this.proveedoresService.obtenerProveedor(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar un nuevo proveedor' })
  crearProveedor(
    @Body() dto: {
      nit?: string;
      razonSocial: string;
      contacto?: string;
      telefono?: string;
      direccion?: string;
    },
  ) {
    return this.proveedoresService.crearProveedor(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos de un proveedor' })
  actualizarProveedor(
    @Param('id') id: string,
    @Body() dto: {
      nit?: string;
      razonSocial?: string;
      contacto?: string;
      telefono?: string;
      direccion?: string;
    },
  ) {
    return this.proveedoresService.actualizarProveedor(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_ACTIVOS, RolUsuario.ADMIN_ALMACENES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar proveedor si no tiene ingresos vinculados' })
  eliminarProveedor(@Param('id') id: string) {
    return this.proveedoresService.eliminarProveedor(id);
  }
}

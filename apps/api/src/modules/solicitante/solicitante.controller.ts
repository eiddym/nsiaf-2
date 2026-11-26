import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SolicitanteService, CreateSolicitudSuministrosDto, CreateSolicitudActivoDto } from './solicitante.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Portal Solicitante')
@Controller('solicitante')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SolicitanteController {
  constructor(private readonly solicitanteService: SolicitanteService) {}

  @Get('mi-custodia')
  @ApiOperation({ summary: 'Obtener bienes y activos actualmente asignados al usuario en custodia' })
  @ApiResponse({ status: 200, description: 'Lista de activos en custodia personal' })
  getMiCustodia(@CurrentUser() user: any) {
    return this.solicitanteService.getMiCustodia(user.id);
  }

  @Get('catalogo-suministros')
  @ApiOperation({ summary: 'Catálogo de insumos y suministros disponibles para solicitar al almacén' })
  getCatalogoSuministros() {
    return this.solicitanteService.getCatalogoSuministros();
  }

  @Post('solicitud-suministros')
  @ApiOperation({ summary: 'Registrar nueva solicitud de suministros (SMS) hacia el almacén' })
  solicitarSuministros(@CurrentUser() user: any, @Body() dto: CreateSolicitudSuministrosDto) {
    return this.solicitanteService.solicitarSuministros(user.id, dto);
  }

  @Post('solicitud-activo')
  @ApiOperation({ summary: 'Registrar solicitud de asignación o devolución de activo fijo' })
  solicitarActivo(@CurrentUser() user: any, @Body() dto: CreateSolicitudActivoDto) {
    return this.solicitanteService.solicitarActivo(user.id, dto);
  }

  @Get('mis-solicitudes')
  @ApiOperation({ summary: 'Historial unificado de solicitudes de suministros y de activos fijos' })
  getMisSolicitudes(@CurrentUser() user: any) {
    return this.solicitanteService.getMisSolicitudes(user.id);
  }
}

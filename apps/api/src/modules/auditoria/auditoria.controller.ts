import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Auditoría y Trazabilidad Forense')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL, RolUsuario.OBSERVADOR)
  @ApiOperation({ summary: 'Consultar histórico forense de acciones (CREATE, UPDATE, DELETE) en el sistema' })
  listar(
    @Query('tabla') tabla?: string,
    @Query('accion') accion?: string,
    @Query('usuario') usuario?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditoriaService.listar({
      tabla,
      accion,
      usuario,
      limit: limit ? Number(limit) : 100,
    });
  }
}

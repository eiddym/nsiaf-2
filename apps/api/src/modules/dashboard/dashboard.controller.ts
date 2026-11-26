import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Obtener métricas y estadísticas consolidadas según permisos de rol' })
  @ApiResponse({ status: 200, description: 'Resumen ejecutivo con segregación estricta de Activos y Almacenes' })
  getResumen(@CurrentUser() user: any) {
    return this.dashboardService.getResumen(user);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ActivosDashboardStats {
  totalActivos: number;
  activosVigentes: number;
  activosDadosBaja: number;
  activosAsignados: number;
  activosLibres: number;
  estadoBueno: number;
  estadoRegular: number;
  estadoMalo: number;
  valorTotal: number;
  porRubro: Array<{
    id: string;
    codigo: number;
    nombre: string;
    cantidad: number;
    valorTotal: number;
  }>;
  polizasPorVencer: number;
}

export interface AlmacenesDashboardStats {
  totalSuministros: number;
  valorTotalBodega: number;
  totalBajoStock: number;
  articulosBajoStock: Array<{
    id: string;
    codigo: number;
    descripcion: string;
    unidadMedida: string;
    stockActual: number;
    stockMinimo: number;
  }>;
  solicitudesPendientes: number;
  solicitudesEntregadas: number;
  ultimosMovimientos: Array<{
    id: string;
    tipo: string;
    fecha: string;
    cantidad: number;
    saldoCantidad: number;
    subarticulo?: string;
    unidadMedida?: string;
  }>;
}

export interface FuncionarioDashboardStats {
  misActivosEnCustodia: number;
  solicitudesPendientesTotal: number;
  solicitudesSuministrosPendientes: number;
  solicitudesActivosPendientes: number;
}

export interface ResumenDashboard {
  usuario: {
    id: string;
    nombreCompleto: string;
    rol: string;
    accesoActivos: boolean;
    accesoAlmacenes: boolean;
  };
  activos: ActivosDashboardStats | null;
  almacenes: AlmacenesDashboardStats | null;
  funcionario: FuncionarioDashboardStats | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(private http: HttpClient) {}

  getResumen(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>('/api/v1/dashboard/resumen');
  }
}

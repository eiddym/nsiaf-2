import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Seguro {
  id: string;
  numeroPoliza: string;
  aseguradora: string;
  fechaInicio: string;
  fechaFin: string;
  cobertura?: string;
  activo: boolean;
  totalActivos: number;
  valorAsegurado: number;
  estado: string;
  nivelAlerta: 'NORMAL' | 'AVISO_90_DIAS' | 'ALERTA_30_DIAS' | 'URGENTE_7_DIAS' | 'VENCIDO' | 'INACTIVO';
  diasRestantes: number;
  parpadeo: boolean;
  mensaje: string;
  activos?: any[];
}

export interface AlertasSegurosResumen {
  totalPolizas: number;
  resumen: {
    vencidos: number;
    urgente7Dias: number;
    alerta30Dias: number;
    aviso90Dias: number;
    vigentesNormales: number;
  };
  polizasCriticas: Seguro[];
}

@Injectable({
  providedIn: 'root',
})
export class SegurosService {
  private readonly baseUrl = '/api/v1/seguros';

  constructor(private http: HttpClient) {}

  listar(): Observable<Seguro[]> {
    return this.http.get<Seguro[]>(this.baseUrl);
  }

  obtenerAlertas(): Observable<AlertasSegurosResumen> {
    return this.http.get<AlertasSegurosResumen>(`${this.baseUrl}/alertas`);
  }

  obtenerPorId(id: string): Observable<Seguro> {
    return this.http.get<Seguro>(`${this.baseUrl}/${id}`);
  }

  crear(dto: {
    numeroPoliza: string;
    aseguradora: string;
    fechaInicio: string;
    fechaFin: string;
    cobertura?: string;
    activoIds?: string[];
  }): Observable<Seguro> {
    return this.http.post<Seguro>(this.baseUrl, dto);
  }

  actualizar(id: string, dto: Partial<Seguro>): Observable<Seguro> {
    return this.http.put<Seguro>(`${this.baseUrl}/${id}`, dto);
  }

  vincularActivos(seguroId: string, activoIds: string[]): Observable<Seguro> {
    return this.http.post<Seguro>(`${this.baseUrl}/${seguroId}/activos`, { activoIds });
  }

  desvincularActivo(seguroId: string, activoId: string): Observable<Seguro> {
    return this.http.delete<Seguro>(`${this.baseUrl}/${seguroId}/activos/${activoId}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditoriaRegistro {
  id: string;
  tabla: string;
  registroId: string;
  accion: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  usuarioId?: string;
  usuarioUsername?: string;
  ip?: string;
  fecha: string;
}

export interface AuditoriaResponse {
  total: number;
  tablas: Array<{ tabla: string; cantidad: number }>;
  registros: AuditoriaRegistro[];
}

@Injectable({
  providedIn: 'root',
})
export class AuditoriaService {
  private readonly apiUrl = '/api/v1/auditoria';

  constructor(private http: HttpClient) {}

  listar(filtros?: { tabla?: string; accion?: string; usuario?: string; limit?: number }): Observable<AuditoriaResponse> {
    let params = new HttpParams();
    if (filtros?.tabla) params = params.set('tabla', filtros.tabla);
    if (filtros?.accion) params = params.set('accion', filtros.accion);
    if (filtros?.usuario) params = params.set('usuario', filtros.usuario);
    if (filtros?.limit) params = params.set('limit', String(filtros.limit));
    return this.http.get<AuditoriaResponse>(this.apiUrl, { params });
  }
}

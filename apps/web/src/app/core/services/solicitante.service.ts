import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SolicitudSuministrosPayload {
  justificacion: string;
  items: Array<{
    subarticuloId: string;
    cantidad: number;
  }>;
}

export interface SolicitudActivoPayload {
  tipo: 'ASIGNACION' | 'DEVOLUCION';
  activoId?: string;
  rubro?: string;
  descripcion: string;
  justificacion?: string;
  documentoCite?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SolicitanteService {
  constructor(private http: HttpClient) {}

  getMiCustodia(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/solicitante/mi-custodia');
  }

  getCatalogoSuministros(): Observable<any[]> {
    return this.http.get<any[]>('/api/v1/solicitante/catalogo-suministros');
  }

  solicitarSuministros(payload: SolicitudSuministrosPayload): Observable<any> {
    return this.http.post('/api/v1/solicitante/solicitud-suministros', payload);
  }

  solicitarActivo(payload: SolicitudActivoPayload): Observable<any> {
    return this.http.post('/api/v1/solicitante/solicitud-activo', payload);
  }

  getMisSolicitudes(): Observable<{ suministros: any[]; activos: any[] }> {
    return this.http.get<{ suministros: any[]; activos: any[] }>('/api/v1/solicitante/mis-solicitudes');
  }
}

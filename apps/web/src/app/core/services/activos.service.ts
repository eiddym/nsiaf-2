import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivoFijo, ActivosResponse, ActivosEstadisticas } from '../models/activo.models';

@Injectable({
  providedIn: 'root',
})
export class ActivosService {
  private readonly baseUrl = '/api/v1/activos';

  constructor(private http: HttpClient) {}

  listar(page = 1, limit = 10, search?: string): Observable<ActivosResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<ActivosResponse>(this.baseUrl, { params });
  }

  obtenerPorId(id: string): Observable<ActivoFijo> {
    return this.http.get<ActivoFijo>(`${this.baseUrl}/${id}`);
  }

  obtenerEstadisticas(): Observable<ActivosEstadisticas> {
    return this.http.get<ActivosEstadisticas>(`${this.baseUrl}/estadisticas`);
  }

  crearActivo(dto: any): Observable<ActivoFijo> {
    return this.http.post<ActivoFijo>(this.baseUrl, dto);
  }

  crearIngreso(dto: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ingreso`, dto);
  }

  crearActa(dto: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/acta`, dto);
  }

  descargarActaPdf(actaId: string): Observable<Blob> {
    return this.http.get(`/api/v1/pdf/acta/${actaId}`, { responseType: 'blob' });
  }

  descargarReporteDepreciacionPdf(): Observable<Blob> {
    return this.http.get('/api/v1/pdf/reportes/depreciacion', { responseType: 'blob' });
  }

  descargarReporteResumenPdf(): Observable<Blob> {
    return this.http.get('/api/v1/pdf/reportes/resumen', { responseType: 'blob' });
  }

  descargarReporteBajasPdf(): Observable<Blob> {
    return this.http.get('/api/v1/pdf/reportes/bajas', { responseType: 'blob' });
  }

  listarActas(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/actas`);
  }

  verificarActivo(code: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/verificar/${encodeURIComponent(code)}`);
  }

  obtenerQr(id: string): Observable<{ qrDataUrl: string }> {
    return this.http.get<{ qrDataUrl: string }>(`${this.baseUrl}/${id}/qr`);
  }

  registrarVerificacionFisica(dto: {
    identificador: string;
    estado: 'BUENO' | 'REGULAR' | 'MALO';
    estadoVigencia: 'VIGENTE' | 'PROPUESTO_BAJA' | 'EN_REVISION';
    observaciones?: string;
    ubicacionFisica?: string;
    verificador?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/verificacion-fisica`, dto);
  }
}

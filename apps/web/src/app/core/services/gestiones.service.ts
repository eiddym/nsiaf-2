import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Gestion {
  id: string;
  anio: number;
  cerrado: boolean;
  fechaCierre?: string;
  cerradoPor?: {
    id: string;
    nombres: string;
    apellidos: string;
    username: string;
  };
  _count?: {
    cierreActivos: number;
  };
}

export interface Ufv {
  id: string;
  fecha: string;
  valor: number | string;
}

@Injectable({
  providedIn: 'root',
})
export class GestionesService {
  private readonly baseUrl = '/api/v1/gestiones';

  constructor(private http: HttpClient) {}

  listarGestiones(): Observable<Gestion[]> {
    return this.http.get<Gestion[]>(this.baseUrl);
  }

  crearGestion(anio: number): Observable<Gestion> {
    return this.http.post<Gestion>(this.baseUrl, { anio });
  }

  cerrarGestion(anio: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${anio}/cerrar`, {});
  }

  listarUfvs(): Observable<Ufv[]> {
    return this.http.get<Ufv[]>(`${this.baseUrl}/ufvs/historial`);
  }

  registrarUfv(dto: { fecha: string; valor: number }): Observable<Ufv> {
    return this.http.post<Ufv>(`${this.baseUrl}/ufvs`, dto);
  }
}

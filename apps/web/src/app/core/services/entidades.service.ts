import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InstitucionHija {
  id: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  entidadId: string;
  unidades?: Array<{ id: string; codigo: number; nombre: string }>;
  almacenes?: Array<{ id: string; codigo: string; nombre: string; esCentral: boolean }>;
  createdAt?: string;
}

export interface Entidad {
  id: string;
  codigo: string;
  nombre: string;
  sigla: string;
  encabezado?: string;
  piePagina?: string;
  edificios?: InstitucionHija[];
  createdAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EntidadesService {
  private readonly baseUrl = '/api/v1/entidades';

  constructor(private http: HttpClient) {}

  listar(): Observable<Entidad[]> {
    return this.http.get<Entidad[]>(this.baseUrl);
  }

  obtenerPorId(id: string): Observable<Entidad> {
    return this.http.get<Entidad>(`${this.baseUrl}/${id}`);
  }

  crearEntidad(dto: Partial<Entidad>): Observable<Entidad> {
    return this.http.post<Entidad>(this.baseUrl, dto);
  }

  actualizarEntidad(id: string, dto: Partial<Entidad>): Observable<Entidad> {
    return this.http.put<Entidad>(`${this.baseUrl}/${id}`, dto);
  }

  crearInstitucion(entidadId: string, dto: { codigo: string; nombre: string; direccion?: string }): Observable<InstitucionHija> {
    return this.http.post<InstitucionHija>(`${this.baseUrl}/${entidadId}/instituciones`, dto);
  }

  actualizarInstitucion(id: string, dto: { nombre?: string; direccion?: string }): Observable<InstitucionHija> {
    return this.http.put<InstitucionHija>(`${this.baseUrl}/instituciones/${id}`, dto);
  }

  eliminarInstitucion(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/instituciones/${id}`);
  }
}

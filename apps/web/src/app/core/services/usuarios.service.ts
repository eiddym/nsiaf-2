import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioItem {
  id: string;
  ci: string;
  username: string;
  nombres: string;
  apellidos: string;
  cargo?: string | null;
  email?: string | null;
  telefono?: string | null;
  rol: string;
  accesoActivos: boolean;
  accesoAlmacenes: boolean;
  activo: boolean;
  jerarquia?: string | null;
  esJefe: boolean;
  unidadId?: string | null;
  unidad?: {
    id: string;
    codigo: number;
    nombre: string;
    sigla?: string | null;
    edificio?: {
      id: string;
      nombre: string;
      entidad?: { id: string; nombre: string; sigla: string };
    };
  } | null;
  _count?: {
    activosCustodia: number;
    solicitudesAlmacen: number;
    solicitudesActivos: number;
  };
  createdAt?: string;
}

export interface RolCatalogo {
  rol: string;
  nombre: string;
  descripcion: string;
  accesoActivos: boolean;
  accesoAlmacenes: boolean;
}

export interface UsuariosResumen {
  total: number;
  activos: number;
  inactivos: number;
  porRol: Array<{ rol: string; cantidad: number }>;
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly apiUrl = '/api/v1/usuarios';

  constructor(private http: HttpClient) {}

  listar(filtros?: { search?: string; rol?: string; activo?: string; unidadId?: string }): Observable<UsuarioItem[]> {
    let params = new HttpParams();
    if (filtros?.search) params = params.set('search', filtros.search);
    if (filtros?.rol) params = params.set('rol', filtros.rol);
    if (filtros?.activo) params = params.set('activo', filtros.activo);
    if (filtros?.unidadId) params = params.set('unidadId', filtros.unidadId);
    return this.http.get<UsuarioItem[]>(this.apiUrl, { params });
  }

  obtenerResumen(): Observable<UsuariosResumen> {
    return this.http.get<UsuariosResumen>(`${this.apiUrl}/resumen`);
  }

  getRolesDisponibles(): Observable<RolCatalogo[]> {
    return this.http.get<RolCatalogo[]>(`${this.apiUrl}/roles-disponibles`);
  }

  crear(dto: any): Observable<UsuarioItem> {
    return this.http.post<UsuarioItem>(this.apiUrl, dto);
  }

  actualizar(id: string, dto: any): Observable<UsuarioItem> {
    return this.http.put<UsuarioItem>(`${this.apiUrl}/${id}`, dto);
  }

  cambiarEstado(id: string, activo: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/estado`, { activo });
  }

  resetearPassword(id: string, password: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/password`, { password });
  }
}

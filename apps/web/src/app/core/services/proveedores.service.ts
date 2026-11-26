import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Proveedor {
  id: string;
  nit?: string;
  razonSocial: string;
  contacto?: string;
  telefono?: string;
  direccion?: string;
  _count?: {
    ingresosActivo: number;
    ingresosAlmacen: number;
  };
  createdAt?: string;
}

export interface ProveedoresResponse {
  data: Proveedor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService {
  private readonly baseUrl = '/api/v1/proveedores';

  constructor(private http: HttpClient) {}

  listar(page = 1, limit = 50, search?: string): Observable<ProveedoresResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<ProveedoresResponse>(this.baseUrl, { params });
  }

  obtenerPorId(id: string): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.baseUrl}/${id}`);
  }

  crear(dto: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.baseUrl, dto);
  }

  actualizar(id: string, dto: Partial<Proveedor>): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.baseUrl}/${id}`, dto);
  }

  eliminar(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubalmacenChild {
  id: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  responsable?: { nombres: string; apellidos: string };
  _count: { stocks: number };
}

export interface AlmacenItem {
  id: string;
  codigo: string;
  nombre: string;
  direccion?: string;
  esCentral: boolean;
  almacenPadreId?: string;
  almacenPadre?: { id: string; codigo: string; nombre: string };
  subalmacenes: SubalmacenChild[];
  responsable?: { id: string; ci: string; nombres: string; apellidos: string; cargo?: string };
  _count: { stocks: number; solicitudes: number };
}

export interface StockAlmacenItem {
  id: string;
  almacenId: string;
  subarticuloId: string;
  stockActual: number | string;
  costoPromedio: number | string;
  stockMinimo: number | string;
  ubicacionEstante?: string;
  subarticulo: {
    id: string;
    codigo: number;
    descripcion: string;
    unidadMedida: string;
    costoUnitarioPromedio: number | string;
    material: { codigo: string; descripcion: string };
  };
}

export interface StocksResponse {
  almacen: AlmacenItem;
  stocks: StockAlmacenItem[];
}

export interface KardexMovimiento {
  id: string;
  fecha: string;
  tipoMovimiento: string;
  referenciaTipo: string;
  documentoCite?: string;
  cantidad: number | string;
  costoUnitario: number | string;
  costoTotal: number | string;
  saldoCantidad: number | string;
  saldoCostoTotal: number | string;
  almacen?: { nombre: string; codigo: string };
}

export interface KardexResponse {
  subarticulo: {
    id: string;
    codigo: number;
    descripcion: string;
    unidadMedida: string;
  };
  movimientos: KardexMovimiento[];
}

@Injectable({
  providedIn: 'root',
})
export class AlmacenesClientService {
  private readonly baseUrl = '/api/v1/almacenes';

  constructor(private http: HttpClient) {}

  listarAlmacenes(): Observable<AlmacenItem[]> {
    return this.http.get<AlmacenItem[]>(this.baseUrl);
  }

  obtenerStocksPorAlmacen(almacenId: string): Observable<StocksResponse> {
    return this.http.get<StocksResponse>(`${this.baseUrl}/${almacenId}/stocks`);
  }

  realizarTraspaso(payload: {
    almacenOrigenId: string;
    almacenDestinoId: string;
    documentoCite?: string;
    motivo?: string;
    items: { subarticuloId: string; cantidad: number }[];
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/traspasos`, payload);
  }

  obtenerKardex(subarticuloId: string, almacenId?: string): Observable<KardexResponse> {
    const url = almacenId
      ? `${this.baseUrl}/subarticulos/${subarticuloId}/kardex?almacenId=${almacenId}`
      : `${this.baseUrl}/subarticulos/${subarticuloId}/kardex`;
    return this.http.get<KardexResponse>(url);
  }

  crearIngreso(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/ingresos`, payload);
  }

  crearSolicitud(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/solicitudes`, payload);
  }

  crearAlmacen(payload: any): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  descargarKardexPdf(subarticuloId: string, almacenId?: string): Observable<Blob> {
    const query = almacenId ? `?almacenId=${almacenId}` : '';
    return this.http.get(`/api/v1/pdf/kardex/${subarticuloId}${query}`, { responseType: 'blob' });
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfiguracionSistemaData {
  id: string;
  nombreEntidad: string;
  siglaEntidad: string;
  regimenNormativo: 'PUBLICO' | 'PRIVADO';
  modalidadAdministracion: 'DESCENTRALIZADA' | 'UNIFICADA';
  exigirCite: boolean;
  responsableActivosId?: string;
  responsableAlmacenesId?: string;
  ssoAuthentikHabilitado: boolean;
  authentikIssuerUrl?: string;
  authentikClientId?: string;
  authentikLdapUrl?: string;
  responsableActivos?: any;
  responsableAlmacenes?: any;
  auxiliaresActivos?: any[];
  auxiliaresAlmacenes?: any[];
  usuariosDisponibles: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  constructor(private http: HttpClient) {}

  getConfiguracion(): Observable<ConfiguracionSistemaData> {
    return this.http.get<ConfiguracionSistemaData>('/api/v1/configuracion');
  }

  updateConfiguracion(data: Partial<ConfiguracionSistemaData> & { auxiliaresActivosIds?: string[]; auxiliaresAlmacenesIds?: string[] }): Observable<ConfiguracionSistemaData> {
    return this.http.put<ConfiguracionSistemaData>('/api/v1/configuracion', data);
  }

  cargarClasificadores2027(): Observable<any> {
    return this.http.post('/api/v1/configuracion/cargar-clasificadores-2027', {});
  }
}

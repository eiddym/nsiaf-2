import { RolUsuario } from '@nsiaf/shared';

export interface UsuarioPerfil {
  id: string;
  ci: string;
  username: string;
  nombres: string;
  apellidos: string;
  nombreCompleto?: string;
  email?: string;
  cargo?: string;
  rol: RolUsuario;
  accesoActivos: boolean;
  accesoAlmacenes: boolean;
  jerarquia?: string;
  esJefe?: boolean;
  unidadId?: string;
  unidad?: string;
  edificio?: string;
  entidad?: string;
  siglaEntidad?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  usuario: UsuarioPerfil;
}

import { EstadoActivo } from '@nsiaf/shared';

export interface CuentaContableDto {
  id: string;
  codigo: number;
  nombre: string;
  vidaUtilMeses: number;
}

export interface AuxiliarDto {
  id: string;
  codigo: number;
  nombre: string;
}

export interface CustodioDto {
  id: string;
  ci: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
}

export interface ActivoFijo {
  id: string;
  codigo: number;
  codigoBarras: string;
  descripcion: string;
  detalle?: string;
  marca?: string;
  modelo?: string;
  serie?: string;
  color?: string;
  material?: string;
  medidas?: string;
  estado: EstadoActivo;
  precioInicial: number | string;
  valorResidual: number | string;
  depreciacionAcumulada: number | string;
  vidaUtilRestanteMeses: number;
  ubicacion?: string;
  cuentaContable?: CuentaContableDto;
  auxiliar?: AuxiliarDto;
  usuarioCustodio?: CustodioDto;
  createdAt: string;
}

export interface ActivosResponse {
  data: ActivoFijo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivosEstadisticas {
  totalActivos: number;
  valorTotal: number;
  porEstado: { estado: string; cantidad: number }[];
  porCuenta: { cuenta: string; codigo: number; cantidad: number }[];
}

// Roles del Sistema
export enum RolUsuario {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_ACTIVOS = 'ADMIN_ACTIVOS',
  ADMIN_ALMACENES = 'ADMIN_ALMACENES',
  OBSERVADOR = 'OBSERVADOR',
  FUNCIONARIO = 'FUNCIONARIO',
}

// Estados del Activo Fijo
export enum EstadoActivo {
  BUENO = 'BUENO',
  REGULAR = 'REGULAR',
  MALO = 'MALO',
}

// Tipos de Acta de Activos
export enum TipoActa {
  ENTREGA = 'ENTREGA',
  DEVOLUCION = 'DEVOLUCION',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

// Tipos de Ingreso de Almacén o Activo
export enum TipoIngreso {
  COMPRA = 'COMPRA',
  DONACION = 'DONACION',
  TRASPASO = 'TRASPASO',
  SALDO_INICIAL = 'SALDO_INICIAL',
}

// Estado de Solicitudes de Suministros
export enum EstadoSolicitud {
  PENDIENTE = 'PENDIENTE',
  APROBADA = 'APROBADA',
  ENTREGADA = 'ENTREGADA',
  RECHAZADA = 'RECHAZADA',
  ANULADA = 'ANULADA',
}

// Método de Valuación de Inventarios
export enum MetodoValoracion {
  PEPS = 'PEPS',
  PROMEDIO_PONDERADO = 'PROMEDIO_PONDERADO',
}

// Tipos de Movimiento de Kardex
export enum TipoMovimientoKardex {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE_POSITIVO = 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO',
}

// Interfaces Compartidas
export interface UsuarioSesionDto {
  id: string;
  ci: string;
  username: string;
  nombreCompleto: string;
  email: string;
  rol: RolUsuario;
  unidadId?: string;
  unidadNombre?: string;
  cargo?: string;
}

export interface RespuestaPaginada<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

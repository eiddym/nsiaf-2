// Roles del Sistema
export enum RolUsuario {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_GENERAL = 'ADMIN_GENERAL',
  ADMIN_ACTIVOS = 'ADMIN_ACTIVOS',
  AUXILIAR_ACTIVOS = 'AUXILIAR_ACTIVOS',
  ADMIN_ALMACENES = 'ADMIN_ALMACENES',
  AUXILIAR_ALMACENES = 'AUXILIAR_ALMACENES',
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
  REINGRESO = 'REINGRESO',
  DONACION = 'DONACION',
  TRASPASO = 'TRASPASO',
  SALDO_INICIAL = 'SALDO_INICIAL',
}

// Estado de Solicitudes de Suministros y Activos
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
  TRASPASO_SALIDA = 'TRASPASO_SALIDA',
  TRASPASO_ENTRADA = 'TRASPASO_ENTRADA',
  AJUSTE_POSITIVO = 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO',
}

// Interfaces Compartidas
export interface UsuarioSesionDto {
  id: string;
  ci: string;
  username: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
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

export interface RespuestaPaginada<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

# NSIAF v2

**Sistema Integrado de Activos Fijos y Almacenes** — reescritura moderna del sistema NSIAF, con arquitectura de monorepo, backend NestJS, base de datos PostgreSQL en Docker y frontend Angular 19.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo 2 + pnpm 11 workspaces |
| Backend | NestJS 10 + Prisma 6 + TypeScript 5.7 |
| Base de datos | PostgreSQL 16 (Docker) |
| Caché / colas | Redis 7 |
| Generación de PDF | Gotenberg 8 |
| Frontend | Angular 19 + Angular Material |
| Servidor web | Nginx (build de producción) |
| Contenedores | Docker Compose |

## Estructura del proyecto

```
.
├── apps/
│   ├── api/                 # API REST NestJS + Prisma
│   │   ├── prisma/          # Esquema y migraciones
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── activos/
│   │       │   └── almacenes/
│   │       └── prisma/
│   └── web/                 # Frontend Angular 19
│       └── src/app/
├── packages/
│   └── shared/              # Enums, DTOs e interfaces compartidas
├── docker/
│   └── postgres/init.sql
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

## Servicios y puertos

| Servicio | Contenedor | Puerto |
|----------|-----------|--------|
| PostgreSQL 16 | `nsiaf-v2-db` | `5436` |
| Redis 7 | `nsiaf-v2-redis` | `6380` |
| Gotenberg 8 | `nsiaf-v2-gotenberg` | `3004` |
| API NestJS | `nsiaf-v2-api` | `3002` |
| Web Angular + Nginx | `nsiaf-v2-web` | `8086` |

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Dependencias
pnpm install

# 3. Levantar el stack completo
docker compose up -d --build
```

También disponible:

```bash
pnpm docker:up      # docker compose up -d
pnpm docker:down    # docker compose down
pnpm docker:logs    # logs en vivo
pnpm dev            # desarrollo con Turbo (API + Web)
pnpm build          # build de todos los paquetes
```

### URLs

- Web: <http://localhost:8086>
- API REST: <http://localhost:3002/api/v1>
- Swagger / OpenAPI: <http://localhost:3002/api/docs>

## API — endpoints iniciales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/v1/activos` | Listado paginado de activos (`page`, `limit`, `search`) |
| GET | `/api/v1/activos/codigo-barras/:barcode` | Buscar activo por código de barras |
| GET | `/api/v1/activos/:id` | Detalle completo de un activo |
| GET | `/api/v1/almacenes/subarticulos` | Subartículos (suministros) con stock actual |
| GET | `/api/v1/almacenes/subarticulos/:id/kardex` | Kardex físico valorado de un subartículo |
| GET | `/api/v1/almacenes/solicitudes` | Solicitudes de suministros |

## Modelo de datos

El esquema Prisma define el dominio completo del sistema:

- **Organización:** `Entidad`, `Edificio`, `Unidad`, `Usuario`
- **Contabilidad:** `CuentaContable`, `Auxiliar`, `Ufv`, `Gestion`, `CierreActivo`
- **Activos fijos:** `Activo`, `IngresoActivo`, `Acta`, `ActaDetalle`, `BajaActivo`, `Seguro`, `ActivoSeguro`
- **Almacenes:** `Material`, `Subarticulo`, `IngresoAlmacen`, `DetalleIngresoAlmacen`, `SolicitudAlmacen`, `DetalleSolicitudAlmacen`, `KardexAlmacen`
- **Proveedores y auditoría:** `Proveedor`, `Auditoria`

Métodos de valoración soportados: **PEPS** y **Promedio Ponderado**.

## Estado actual

- ✅ Monorepo y pipelines de build (Turborepo + pnpm) operativos.
- ✅ Stack Docker completo (PostgreSQL, Redis, Gotenberg, API, Web) funcionando.
- ✅ Esquema Prisma del dominio completo.
- ✅ Módulos iniciales de **Activos Fijos** y **Almacenes** con Swagger.
- ✅ Dashboard inicial en Angular 19.
- 🚧 Próximos pasos: autenticación JWT, actas, bajas, seguros, kardex completo e integración con Plantillas.

## Origen

Proyecto recuperado del historial de trabajo de **Antigravity** y publicado en GitHub para su respaldo y continuidad.

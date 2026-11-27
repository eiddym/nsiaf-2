import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

export interface CreateUsuarioDto {
  ci: string;
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  rol: RolUsuario;
  accesoActivos?: boolean;
  accesoAlmacenes?: boolean;
  unidadId?: string | null;
  jerarquia?: string;
  esJefe?: boolean;
}

export interface UpdateUsuarioDto {
  ci?: string;
  username?: string;
  nombres?: string;
  apellidos?: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  rol?: RolUsuario;
  accesoActivos?: boolean;
  accesoAlmacenes?: boolean;
  activo?: boolean;
  unidadId?: string | null;
  jerarquia?: string;
  esJefe?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  private derivarAccesos(rol: RolUsuario, accesoActivos?: boolean, accesoAlmacenes?: boolean) {
    if (rol === RolUsuario.SUPER_ADMIN || rol === RolUsuario.ADMIN_GENERAL) {
      return { accesoActivos: true, accesoAlmacenes: true };
    }
    if (rol === RolUsuario.ADMIN_ACTIVOS || rol === RolUsuario.AUXILIAR_ACTIVOS) {
      return {
        accesoActivos: accesoActivos ?? true,
        accesoAlmacenes: accesoAlmacenes ?? false,
      };
    }
    if (rol === RolUsuario.ADMIN_ALMACENES || rol === RolUsuario.AUXILIAR_ALMACENES) {
      return {
        accesoActivos: accesoActivos ?? false,
        accesoAlmacenes: accesoAlmacenes ?? true,
      };
    }
    return {
      accesoActivos: accesoActivos ?? false,
      accesoAlmacenes: accesoAlmacenes ?? false,
    };
  }

  async listar(filtros?: { search?: string; rol?: RolUsuario; activo?: string; unidadId?: string }) {
    const where: any = {};

    if (filtros?.search?.trim()) {
      const q = filtros.search.trim();
      where.OR = [
        { nombres: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { ci: { contains: q, mode: 'insensitive' } },
        { cargo: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filtros?.rol) {
      where.rol = filtros.rol;
    }

    if (filtros?.activo === 'true' || filtros?.activo === 'false') {
      where.activo = filtros.activo === 'true';
    }

    if (filtros?.unidadId) {
      where.unidadId = filtros.unidadId;
    }

    const usuarios = await this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        ci: true,
        username: true,
        nombres: true,
        apellidos: true,
        cargo: true,
        email: true,
        telefono: true,
        rol: true,
        accesoActivos: true,
        accesoAlmacenes: true,
        activo: true,
        jerarquia: true,
        esJefe: true,
        unidadId: true,
        unidad: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            sigla: true,
            edificio: {
              select: {
                id: true,
                nombre: true,
                entidad: { select: { id: true, nombre: true, sigla: true } },
              },
            },
          },
        },
        _count: {
          select: {
            activosCustodia: true,
            solicitudesAlmacen: true,
            solicitudesActivos: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ activo: 'desc' }, { nombres: 'asc' }],
    });

    return usuarios;
  }

  async obtenerResumen() {
    const [total, activos, porRol] = await Promise.all([
      this.prisma.usuario.count(),
      this.prisma.usuario.count({ where: { activo: true } }),
      this.prisma.usuario.groupBy({
        by: ['rol'],
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      activos,
      inactivos: total - activos,
      porRol: porRol.map((r) => ({ rol: r.rol, cantidad: r._count._all })),
    };
  }

  async crear(dto: CreateUsuarioDto, actor?: { id?: string; username?: string }) {
    if (!dto.ci?.trim() || !dto.username?.trim() || !dto.password?.trim()) {
      throw new BadRequestException('CI, nombre de usuario y contraseña inicial son obligatorios.');
    }
    if (dto.password.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    }

    const existente = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ username: dto.username.trim() }, { ci: dto.ci.trim() }],
      },
    });

    if (existente) {
      throw new BadRequestException('Ya existe un usuario registrado con ese CI o nombre de usuario.');
    }

    const rol = dto.rol || RolUsuario.FUNCIONARIO;
    const accesos = this.derivarAccesos(rol, dto.accesoActivos, dto.accesoAlmacenes);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const creado = await this.prisma.usuario.create({
      data: {
        ci: dto.ci.trim(),
        username: dto.username.trim().toLowerCase(),
        passwordHash,
        nombres: dto.nombres.trim(),
        apellidos: dto.apellidos.trim(),
        cargo: dto.cargo?.trim() || null,
        email: dto.email?.trim() || null,
        telefono: dto.telefono?.trim() || null,
        rol,
        accesoActivos: accesos.accesoActivos,
        accesoAlmacenes: accesos.accesoAlmacenes,
        unidadId: dto.unidadId || null,
        jerarquia: dto.jerarquia || 'OPERADOR',
        esJefe: !!dto.esJefe,
        activo: true,
      },
      select: {
        id: true,
        ci: true,
        username: true,
        nombres: true,
        apellidos: true,
        cargo: true,
        email: true,
        telefono: true,
        rol: true,
        accesoActivos: true,
        accesoAlmacenes: true,
        activo: true,
        jerarquia: true,
        esJefe: true,
        unidadId: true,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        tabla: 'usuarios',
        registroId: creado.id,
        accion: 'CREATE',
        datosNuevos: creado as any,
        usuarioId: actor?.id,
        usuarioUsername: actor?.username,
      },
    });

    return creado;
  }

  async actualizar(id: string, dto: UpdateUsuarioDto, actor?: { id?: string; username?: string }) {
    const actual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!actual) {
      throw new NotFoundException(`No se encontró el usuario con ID ${id}`);
    }

    if (dto.username && dto.username.trim().toLowerCase() !== actual.username) {
      const dup = await this.prisma.usuario.findUnique({ where: { username: dto.username.trim().toLowerCase() } });
      if (dup) throw new BadRequestException('Ese nombre de usuario ya está en uso.');
    }

    if (dto.ci && dto.ci.trim() !== actual.ci) {
      const dup = await this.prisma.usuario.findUnique({ where: { ci: dto.ci.trim() } });
      if (dup) throw new BadRequestException('Ese número de CI ya está registrado.');
    }

    const nuevoRol = dto.rol ?? actual.rol;
    const accesos = this.derivarAccesos(
      nuevoRol,
      dto.accesoActivos !== undefined ? dto.accesoActivos : dto.rol ? undefined : actual.accesoActivos,
      dto.accesoAlmacenes !== undefined ? dto.accesoAlmacenes : dto.rol ? undefined : actual.accesoAlmacenes,
    );

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        ci: dto.ci !== undefined ? dto.ci.trim() : actual.ci,
        username: dto.username !== undefined ? dto.username.trim().toLowerCase() : actual.username,
        nombres: dto.nombres !== undefined ? dto.nombres.trim() : actual.nombres,
        apellidos: dto.apellidos !== undefined ? dto.apellidos.trim() : actual.apellidos,
        cargo: dto.cargo !== undefined ? dto.cargo?.trim() || null : actual.cargo,
        email: dto.email !== undefined ? dto.email?.trim() || null : actual.email,
        telefono: dto.telefono !== undefined ? dto.telefono?.trim() || null : actual.telefono,
        rol: nuevoRol,
        accesoActivos: accesos.accesoActivos,
        accesoAlmacenes: accesos.accesoAlmacenes,
        activo: dto.activo !== undefined ? dto.activo : actual.activo,
        unidadId: dto.unidadId !== undefined ? dto.unidadId || null : actual.unidadId,
        jerarquia: dto.jerarquia !== undefined ? dto.jerarquia : actual.jerarquia,
        esJefe: dto.esJefe !== undefined ? dto.esJefe : actual.esJefe,
      },
      select: {
        id: true,
        ci: true,
        username: true,
        nombres: true,
        apellidos: true,
        cargo: true,
        email: true,
        telefono: true,
        rol: true,
        accesoActivos: true,
        accesoAlmacenes: true,
        activo: true,
        jerarquia: true,
        esJefe: true,
        unidadId: true,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        tabla: 'usuarios',
        registroId: id,
        accion: 'UPDATE',
        datosAnteriores: { rol: actual.rol, accesoActivos: actual.accesoActivos, accesoAlmacenes: actual.accesoAlmacenes, activo: actual.activo } as any,
        datosNuevos: actualizado as any,
        usuarioId: actor?.id,
        usuarioUsername: actor?.username,
      },
    });

    return actualizado;
  }

  async cambiarEstado(id: string, activo: boolean, actor?: { id?: string; username?: string }) {
    const actual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No se encontró el usuario con ID ${id}`);
    if (actual.id === actor?.id && !activo) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta de administrador.');
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: { activo },
      select: { id: true, username: true, activo: true },
    });

    await this.prisma.auditoria.create({
      data: {
        tabla: 'usuarios',
        registroId: id,
        accion: 'UPDATE',
        datosAnteriores: { activo: actual.activo } as any,
        datosNuevos: { activo } as any,
        usuarioId: actor?.id,
        usuarioUsername: actor?.username,
      },
    });

    return actualizado;
  }

  async resetearPassword(id: string, nuevaPassword: string, actor?: { id?: string; username?: string }) {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    const actual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException(`No se encontró el usuario con ID ${id}`);

    const passwordHash = await bcrypt.hash(nuevaPassword, 10);
    await this.prisma.usuario.update({
      where: { id },
      data: { passwordHash },
    });

    await this.prisma.auditoria.create({
      data: {
        tabla: 'usuarios',
        registroId: id,
        accion: 'UPDATE',
        datosNuevos: { evento: 'RESET_PASSWORD_ADMIN' } as any,
        usuarioId: actor?.id,
        usuarioUsername: actor?.username,
      },
    });

    return { ok: true, mensaje: `Contraseña restablecida correctamente para ${actual.username}` };
  }

  getCatalogoRoles() {
    return [
      {
        rol: RolUsuario.SUPER_ADMIN,
        nombre: 'Super Administrador',
        descripcion: 'Control total del sistema, organigrama, usuarios, roles, auditoría y configuración global.',
        accesoActivos: true,
        accesoAlmacenes: true,
      },
      {
        rol: RolUsuario.ADMIN_GENERAL,
        nombre: 'Administrador General (Unificado)',
        descripcion: 'Opera y supervisa Activos Fijos y Almacenes en conjunto, además de gobernanza.',
        accesoActivos: true,
        accesoAlmacenes: true,
      },
      {
        rol: RolUsuario.ADMIN_ACTIVOS,
        nombre: 'Responsable de Activos Fijos',
        descripcion: 'Administra altas, bajas, asignaciones, seguros, cierres UFV y reportes de bienes de uso.',
        accesoActivos: true,
        accesoAlmacenes: false,
      },
      {
        rol: RolUsuario.AUXILIAR_ACTIVOS,
        nombre: 'Auxiliar / Ayudante de Activos Fijos',
        descripcion: 'Apoyo operativo para despacho de vehículos, maquinaria, herramientas e inspección QR en campo.',
        accesoActivos: true,
        accesoAlmacenes: false,
      },
      {
        rol: RolUsuario.ADMIN_ALMACENES,
        nombre: 'Responsable de Almacenes',
        descripcion: 'Administra bodegas, ingresos, solicitudes de suministros, traspasos y kardex valorado.',
        accesoActivos: false,
        accesoAlmacenes: true,
      },
      {
        rol: RolUsuario.AUXILIAR_ALMACENES,
        nombre: 'Auxiliar / Ayudante de Almacenes',
        descripcion: 'Apoyo operativo para recepción de materiales, despacho físico y control de stock en bodega.',
        accesoActivos: false,
        accesoAlmacenes: true,
      },
      {
        rol: RolUsuario.OBSERVADOR,
        nombre: 'Auditor / Observador',
        descripcion: 'Acceso de solo lectura para auditoría interna y fiscalización.',
        accesoActivos: true,
        accesoAlmacenes: true,
      },
      {
        rol: RolUsuario.FUNCIONARIO,
        nombre: 'Funcionario / Solicitante',
        descripcion: 'Portal de autoservicio: consulta sus bienes en custodia y solicita suministros o activos.',
        accesoActivos: false,
        accesoAlmacenes: false,
      },
    ];
  }
}

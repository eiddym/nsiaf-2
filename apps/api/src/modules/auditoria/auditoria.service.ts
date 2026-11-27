import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: {
    tabla: string;
    registroId: string;
    accion: 'CREATE' | 'UPDATE' | 'DELETE';
    datosAnteriores?: any;
    datosNuevos?: any;
    usuarioId?: string;
    usuarioUsername?: string;
    ip?: string;
  }) {
    return this.prisma.auditoria.create({
      data: {
        tabla: params.tabla,
        registroId: params.registroId,
        accion: params.accion,
        datosAnteriores: params.datosAnteriores ?? undefined,
        datosNuevos: params.datosNuevos ?? undefined,
        usuarioId: params.usuarioId,
        usuarioUsername: params.usuarioUsername,
        ip: params.ip,
      },
    });
  }

  async listar(filtros?: { tabla?: string; accion?: string; usuario?: string; limit?: number }) {
    const where: any = {};
    if (filtros?.tabla) where.tabla = { contains: filtros.tabla, mode: 'insensitive' };
    if (filtros?.accion) where.accion = filtros.accion;
    if (filtros?.usuario) where.usuarioUsername = { contains: filtros.usuario, mode: 'insensitive' };

    const take = Math.min(Math.max(Number(filtros?.limit) || 100, 10), 500);

    const [registros, total, tablas] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        orderBy: { fecha: 'desc' },
        take,
      }),
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.groupBy({
        by: ['tabla'],
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      tablas: tablas.map((t) => ({ tabla: t.tabla, cantidad: t._count._all })),
      registros,
    };
  }
}

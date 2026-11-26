import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSolicitudSuministrosDto {
  justificacion: string;
  items: Array<{
    subarticuloId: string;
    cantidad: number;
  }>;
}

export interface CreateSolicitudActivoDto {
  tipo: 'ASIGNACION' | 'DEVOLUCION';
  activoId?: string;
  rubro?: string;
  descripcion: string;
  justificacion?: string;
  documentoCite?: string;
}

@Injectable()
export class SolicitanteService {
  constructor(private readonly prisma: PrismaService) {}

  async getMiCustodia(usuarioId: string) {
    return this.prisma.activo.findMany({
      where: {
        usuarioCustodioId: usuarioId,
        bajaId: null,
      },
      include: {
        cuentaContable: {
          select: { codigo: true, nombre: true },
        },
        auxiliar: {
          select: { codigo: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCatalogoSuministros() {
    return this.prisma.subarticulo.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        unidadMedida: true,
        stockActual: true,
        material: {
          select: {
            codigo: true,
            descripcion: true,
          },
        },
      },
      orderBy: { descripcion: 'asc' },
    });
  }

  async solicitarSuministros(usuarioId: string, dto: CreateSolicitudSuministrosDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un ítem o suministro');
    }

    // Default to first active almacen
    const almacen = await this.prisma.almacen.findFirst();
    if (!almacen) {
      throw new BadRequestException('No existe almacén configurado en el sistema');
    }

    return this.prisma.solicitudAlmacen.create({
      data: {
        almacenId: almacen.id,
        solicitanteId: usuarioId,
        observacion: dto.justificacion || 'Solicitud de materiales de escritorio / suministros',
        detalles: {
          create: dto.items.map((it) => ({
            subarticuloId: it.subarticuloId,
            cantidadSolicitada: it.cantidad,
          })),
        },
      },
      include: {
        detalles: {
          include: {
            subarticulo: true,
          },
        },
      },
    });
  }

  async solicitarActivo(usuarioId: string, dto: CreateSolicitudActivoDto) {
    if (!dto.descripcion) {
      throw new BadRequestException('La descripción del activo o requerimiento es obligatoria');
    }

    if (dto.tipo === 'DEVOLUCION' && !dto.activoId) {
      throw new BadRequestException('Debe especificar el activo que desea devolver');
    }

    if (dto.activoId) {
      const act = await this.prisma.activo.findUnique({ where: { id: dto.activoId } });
      if (!act) {
        throw new NotFoundException('El activo seleccionado no existe');
      }
      if (dto.tipo === 'DEVOLUCION' && act.usuarioCustodioId !== usuarioId) {
        throw new BadRequestException('Solo puede solicitar la devolución de un bien asignado a su custodia');
      }
    }

    return this.prisma.solicitudActivo.create({
      data: {
        solicitanteId: usuarioId,
        tipo: dto.tipo || 'ASIGNACION',
        activoId: dto.activoId,
        rubro: dto.rubro,
        descripcion: dto.descripcion,
        justificacion: dto.justificacion,
        documentoCite: dto.documentoCite,
      },
      include: {
        activo: true,
      },
    });
  }

  async getMisSolicitudes(usuarioId: string) {
    const suministros = await this.prisma.solicitudAlmacen.findMany({
      where: { solicitanteId: usuarioId },
      include: {
        detalles: {
          include: {
            subarticulo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activos = await this.prisma.solicitudActivo.findMany({
      where: { solicitanteId: usuarioId },
      include: {
        activo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      suministros,
      activos,
    };
  }
}

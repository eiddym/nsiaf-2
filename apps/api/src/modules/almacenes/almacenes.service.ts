import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlmacenesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubarticulos(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { descripcion: { contains: search, mode: 'insensitive' as const } },
            { unidadMedida: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.subarticulo.count({ where }),
      this.prisma.subarticulo.findMany({
        where,
        skip,
        take: limit,
        include: {
          material: true,
        },
        orderBy: { codigo: 'asc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getKardex(subarticuloId: string) {
    const subarticulo = await this.prisma.subarticulo.findUnique({
      where: { id: subarticuloId },
      include: { material: true },
    });

    if (!subarticulo) {
      throw new NotFoundException(`Subartículo con ID ${subarticuloId} no encontrado`);
    }

    const movimientos = await this.prisma.kardexAlmacen.findMany({
      where: { subarticuloId },
      orderBy: { fecha: 'asc' },
    });

    return {
      subarticulo,
      movimientos,
    };
  }

  async listSolicitudes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.solicitudAlmacen.count(),
      this.prisma.solicitudAlmacen.findMany({
        skip,
        take: limit,
        include: {
          solicitante: {
            select: { id: true, ci: true, nombres: true, apellidos: true, cargo: true },
          },
          detalles: {
            include: { subarticulo: true },
          },
        },
        orderBy: { numero: 'desc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

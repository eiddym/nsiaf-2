import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { descripcion: { contains: search, mode: 'insensitive' as const } },
            { codigoBarras: { contains: search, mode: 'insensitive' as const } },
            { marca: { contains: search, mode: 'insensitive' as const } },
            { serie: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, data] = await Promise.all([
      this.prisma.activo.count({ where }),
      this.prisma.activo.findMany({
        where,
        skip,
        take: limit,
        include: {
          cuentaContable: true,
          auxiliar: true,
          usuarioCustodio: {
            select: { id: true, ci: true, nombres: true, apellidos: true, cargo: true },
          },
        },
        orderBy: { codigo: 'desc' },
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

  async findOne(id: string) {
    const activo = await this.prisma.activo.findUnique({
      where: { id },
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
        ingreso: { include: { proveedor: true } },
        baja: true,
        actasDetalle: {
          include: {
            acta: {
              include: {
                usuarioFuncionario: { select: { nombres: true, apellidos: true, ci: true } },
              },
            },
          },
        },
      },
    });

    if (!activo) {
      throw new NotFoundException(`Activo con ID ${id} no encontrado`);
    }

    return activo;
  }

  async findByBarcode(barcode: string) {
    const activo = await this.prisma.activo.findUnique({
      where: { codigoBarras: barcode },
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
    });

    if (!activo) {
      throw new NotFoundException(`Activo con código de barras ${barcode} no encontrado`);
    }

    return activo;
  }
}

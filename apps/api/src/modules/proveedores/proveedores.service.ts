import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProveedoresService {
  constructor(private readonly prisma: PrismaService) {}

  async listarProveedores(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { razonSocial: { contains: q, mode: 'insensitive' } },
        { nit: { contains: q, mode: 'insensitive' } },
        { contacto: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.proveedor.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              ingresosActivo: true,
              ingresosAlmacen: true,
            },
          },
        },
        orderBy: { razonSocial: 'asc' },
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async obtenerProveedor(id: string) {
    const prov = await this.prisma.proveedor.findUnique({
      where: { id },
      include: {
        ingresosActivo: {
          take: 10,
          orderBy: { fecha: 'desc' },
        },
        ingresosAlmacen: {
          take: 10,
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!prov) {
      throw new NotFoundException(`Proveedor con ID ${id} no encontrado`);
    }

    return prov;
  }

  async crearProveedor(dto: {
    nit?: string;
    razonSocial: string;
    contacto?: string;
    telefono?: string;
    direccion?: string;
  }) {
    if (dto.nit && dto.nit.trim()) {
      const existe = await this.prisma.proveedor.findFirst({
        where: { nit: dto.nit.trim() },
      });
      if (existe) {
        throw new BadRequestException(`Ya existe un proveedor registrado con el NIT: ${dto.nit}`);
      }
    }

    return this.prisma.proveedor.create({
      data: {
        nit: dto.nit?.trim() || null,
        razonSocial: dto.razonSocial.trim(),
        contacto: dto.contacto?.trim() || null,
        telefono: dto.telefono?.trim() || null,
        direccion: dto.direccion?.trim() || null,
      },
    });
  }

  async actualizarProveedor(id: string, dto: {
    nit?: string;
    razonSocial?: string;
    contacto?: string;
    telefono?: string;
    direccion?: string;
  }) {
    return this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
  }

  async eliminarProveedor(id: string) {
    const [activos, almacenes] = await Promise.all([
      this.prisma.ingresoActivo.count({ where: { proveedorId: id } }),
      this.prisma.ingresoAlmacen.count({ where: { proveedorId: id } }),
    ]);

    if (activos > 0 || almacenes > 0) {
      throw new BadRequestException('No se puede eliminar el proveedor porque tiene notas de ingreso registradas en el sistema');
    }

    return this.prisma.proveedor.delete({
      where: { id },
    });
  }
}

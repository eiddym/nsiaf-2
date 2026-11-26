import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarEntidades() {
    return this.prisma.entidad.findMany({
      include: {
        edificios: {
          include: {
            unidades: true,
            almacenes: true,
          },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtenerEntidad(id: string) {
    const entidad = await this.prisma.entidad.findUnique({
      where: { id },
      include: {
        edificios: {
          include: {
            unidades: true,
            almacenes: true,
          },
        },
      },
    });

    if (!entidad) {
      throw new NotFoundException(`No se encontró la entidad con ID: ${id}`);
    }

    return entidad;
  }

  async crearEntidad(dto: {
    codigo: string;
    nombre: string;
    sigla: string;
    encabezado?: string;
    piePagina?: string;
  }) {
    const existe = await this.prisma.entidad.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existe) {
      throw new BadRequestException(`Ya existe una entidad con el código: ${dto.codigo}`);
    }

    return this.prisma.entidad.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        sigla: dto.sigla,
        encabezado: dto.encabezado,
        piePagina: dto.piePagina,
      },
    });
  }

  async actualizarEntidad(id: string, dto: {
    nombre?: string;
    sigla?: string;
    encabezado?: string;
    piePagina?: string;
  }) {
    return this.prisma.entidad.update({
      where: { id },
      data: dto,
    });
  }

  // --- Gestión de Instituciones / Edificios Hijas ---

  async listarInstituciones(entidadId?: string) {
    return this.prisma.edificio.findMany({
      where: entidadId ? { entidadId } : {},
      include: {
        entidad: true,
        unidades: true,
        almacenes: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async crearInstitucion(entidadId: string, dto: {
    codigo: string;
    nombre: string;
    direccion?: string;
  }) {
    const entidad = await this.prisma.entidad.findUnique({
      where: { id: entidadId },
    });

    if (!entidad) {
      throw new NotFoundException(`No existe la entidad padre con ID: ${entidadId}`);
    }

    const existeCodigo = await this.prisma.edificio.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existeCodigo) {
      throw new BadRequestException(`Ya existe una institución/edificio con el código: ${dto.codigo}`);
    }

    return this.prisma.edificio.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        direccion: dto.direccion,
        entidadId,
      },
      include: {
        entidad: true,
      },
    });
  }

  async actualizarInstitucion(id: string, dto: {
    nombre?: string;
    direccion?: string;
  }) {
    return this.prisma.edificio.update({
      where: { id },
      data: dto,
    });
  }

  async eliminarInstitucion(id: string) {
    const unidades = await this.prisma.unidad.count({ where: { edificioId: id } });
    const almacenes = await this.prisma.almacen.count({ where: { edificioId: id } });

    if (unidades > 0 || almacenes > 0) {
      throw new BadRequestException('No se puede eliminar la institución porque tiene unidades organizacionales o almacenes dependientes asociados');
    }

    return this.prisma.edificio.delete({
      where: { id },
    });
  }
}

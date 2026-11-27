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

  // --- Gestión de Organigrama Propio (Unidades y Subunidades jerárquicas) ---

  async listarUnidades(edificioId?: string) {
    return this.prisma.unidad.findMany({
      where: edificioId ? { edificioId } : {},
      include: {
        edificio: {
          include: { entidad: true },
        },
        unidadPadre: {
          select: { id: true, codigo: true, nombre: true, sigla: true },
        },
        _count: {
          select: { usuarios: true, subunidades: true },
        },
      },
      orderBy: [{ codigo: 'asc' }, { nombre: 'asc' }],
    });
  }

  async crearUnidad(dto: {
    codigo?: number;
    nombre: string;
    sigla?: string;
    edificioId: string;
    unidadPadreId?: string | null;
  }) {
    const edificio = await this.prisma.edificio.findUnique({ where: { id: dto.edificioId } });
    if (!edificio) {
      throw new NotFoundException(`No existe el edificio/institución con ID: ${dto.edificioId}`);
    }

    let codigo = dto.codigo ? Number(dto.codigo) : undefined;
    if (!codigo) {
      const maxUnidad = await this.prisma.unidad.findFirst({ orderBy: { codigo: 'desc' } });
      codigo = (maxUnidad?.codigo || 100) + 1;
    } else {
      const dup = await this.prisma.unidad.findUnique({ where: { codigo } });
      if (dup) throw new BadRequestException(`Ya existe una unidad con el código ${codigo}`);
    }

    return this.prisma.unidad.create({
      data: {
        codigo,
        nombre: dto.nombre.trim(),
        sigla: dto.sigla?.trim() || null,
        edificioId: dto.edificioId,
        unidadPadreId: dto.unidadPadreId || null,
      },
      include: {
        edificio: { include: { entidad: true } },
        unidadPadre: { select: { id: true, codigo: true, nombre: true, sigla: true } },
      },
    });
  }

  async actualizarUnidad(
    id: string,
    dto: {
      nombre?: string;
      sigla?: string;
      edificioId?: string;
      unidadPadreId?: string | null;
    },
  ) {
    if (dto.unidadPadreId && dto.unidadPadreId === id) {
      throw new BadRequestException('Una unidad no puede ser padre de sí misma.');
    }

    return this.prisma.unidad.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.sigla !== undefined ? { sigla: dto.sigla?.trim() || null } : {}),
        ...(dto.edificioId !== undefined ? { edificioId: dto.edificioId } : {}),
        ...(dto.unidadPadreId !== undefined ? { unidadPadreId: dto.unidadPadreId || null } : {}),
      },
      include: {
        edificio: { include: { entidad: true } },
        unidadPadre: { select: { id: true, codigo: true, nombre: true, sigla: true } },
      },
    });
  }

  async eliminarUnidad(id: string) {
    const [usuarios, subunidades] = await Promise.all([
      this.prisma.usuario.count({ where: { unidadId: id } }),
      this.prisma.unidad.count({ where: { unidadPadreId: id } }),
    ]);

    if (usuarios > 0 || subunidades > 0) {
      throw new BadRequestException(
        'No se puede eliminar la unidad porque tiene usuarios o subunidades dependientes asociadas.',
      );
    }

    return this.prisma.unidad.delete({ where: { id } });
  }

  /**
   * Absorbe un organigrama desde Plantillas (/api/v1/seguridad/unidad_arbol) o desde un arreglo JSON.
   */
  async importarOrganigramaEcosistema(dto: {
    edificioId: string;
    origenUrl?: string;
    tokenBearer?: string;
    unidades?: Array<{
      codigo?: number;
      id_unidad?: number;
      nombre: string;
      sigla?: string;
      abreviacion?: string;
      codigoPadre?: number | null;
      padre?: number | null;
    }>;
  }) {
    const edificio = await this.prisma.edificio.findUnique({ where: { id: dto.edificioId } });
    if (!edificio) {
      throw new NotFoundException('Debe seleccionar un edificio/sucursal válido para absorber el organigrama.');
    }

    let listaEntrada = dto.unidades || [];

    if ((!listaEntrada || listaEntrada.length === 0) && dto.origenUrl?.trim()) {
      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (dto.tokenBearer?.trim()) {
          headers['Authorization'] = dto.tokenBearer.startsWith('Bearer ')
            ? dto.tokenBearer
            : `Bearer ${dto.tokenBearer}`;
        }
        const resp = await fetch(dto.origenUrl.trim(), { headers });
        if (!resp.ok) {
          throw new BadRequestException(`El sistema externo respondió HTTP ${resp.status}`);
        }
        const body: any = await resp.json();
        const raw = Array.isArray(body) ? body : body?.datos?.listado || body?.datos || body?.data || [];
        // Aplanar en caso de árbol con propiedad hijos/children
        const aplanar = (nodes: any[], parentCode: number | null = null): any[] => {
          const out: any[] = [];
          for (const n of nodes) {
            const code = Number(n.codigo || n.id_unidad || n.id);
            out.push({
              codigo: Number.isFinite(code) ? code : undefined,
              nombre: n.nombre || n.descripcion || 'Unidad Sin Nombre',
              sigla: n.sigla || n.abreviacion || null,
              codigoPadre: n.padre ? Number(n.padre) : parentCode,
            });
            const kids = n.hijos || n.children || n.subunidades || [];
            if (Array.isArray(kids) && kids.length > 0) {
              out.push(...aplanar(kids, Number.isFinite(code) ? code : null));
            }
          }
          return out;
        };
        listaEntrada = aplanar(raw);
      } catch (err: any) {
        throw new BadRequestException(
          `No se pudo conectar al endpoint de organigrama externo (${dto.origenUrl}): ${err?.message || err}`,
        );
      }
    }

    if (!listaEntrada || listaEntrada.length === 0) {
      throw new BadRequestException('No se recibieron unidades para importar.');
    }

    const mapaCodigoAId = new Map<number, string>();
    let creadas = 0;
    let actualizadas = 0;

    // Primera pasada: upsert de todas las unidades
    let nextCode = ((await this.prisma.unidad.findFirst({ orderBy: { codigo: 'desc' } }))?.codigo || 1000) + 1;
    const pendientesPadre: Array<{ id: string; codigoPadre: number }> = [];

    for (const item of listaEntrada) {
      const code = Number(item.codigo ?? item.id_unidad);
      const codigoFinal = Number.isFinite(code) && code > 0 ? code : nextCode++;
      const nombre = (item.nombre || 'Unidad').trim();
      const sigla = (item.sigla || item.abreviacion || null)?.toString().trim() || null;

      const existente = await this.prisma.unidad.findUnique({ where: { codigo: codigoFinal } });
      let record;
      if (existente) {
        record = await this.prisma.unidad.update({
          where: { id: existente.id },
          data: { nombre, sigla, edificioId: dto.edificioId },
        });
        actualizadas++;
      } else {
        record = await this.prisma.unidad.create({
          data: { codigo: codigoFinal, nombre, sigla, edificioId: dto.edificioId },
        });
        creadas++;
      }

      mapaCodigoAId.set(codigoFinal, record.id);
      const cp = Number(item.codigoPadre ?? item.padre);
      if (Number.isFinite(cp) && cp > 0 && cp !== codigoFinal) {
        pendientesPadre.push({ id: record.id, codigoPadre: cp });
      }
    }

    // Segunda pasada: enlazar relaciones padre-hijo
    for (const rel of pendientesPadre) {
      const padreId = mapaCodigoAId.get(rel.codigoPadre);
      if (padreId && padreId !== rel.id) {
        await this.prisma.unidad.update({
          where: { id: rel.id },
          data: { unidadPadreId: padreId },
        });
      }
    }

    return {
      ok: true,
      creadas,
      actualizadas,
      totalProcesadas: creadas + actualizadas,
      mensaje: `Organigrama sincronizado: ${creadas} unidades nuevas, ${actualizadas} actualizadas.`,
    };
  }
}

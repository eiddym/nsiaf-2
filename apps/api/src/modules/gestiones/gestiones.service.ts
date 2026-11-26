import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RegistrarUfvDto {
  fecha: string | Date;
  valor: number;
}

@Injectable()
export class GestionesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarGestiones() {
    const gestiones = await this.prisma.gestion.findMany({
      include: {
        cerradoPor: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            username: true,
          },
        },
        _count: {
          select: { cierreActivos: true },
        },
      },
      orderBy: { anio: 'desc' },
    });

    return gestiones;
  }

  async crearGestion(anio: number) {
    const existente = await this.prisma.gestion.findUnique({
      where: { anio },
    });
    if (existente) {
      throw new BadRequestException(`La gestión ${anio} ya se encuentra registrada`);
    }

    return this.prisma.gestion.create({
      data: {
        anio,
        cerrado: false,
      },
    });
  }

  async cerrarGestion(anio: number, userId: string) {
    const gestion = await this.prisma.gestion.findUnique({
      where: { anio },
      include: { cierreActivos: true },
    });

    if (!gestion) {
      throw new NotFoundException(`La gestión ${anio} no existe`);
    }

    if (gestion.cerrado) {
      throw new BadRequestException(`La gestión ${anio} ya se encuentra cerrada`);
    }

    // Obtener activos vigentes (sin baja)
    const activos = await this.prisma.activo.findMany({
      where: { bajaId: null },
      include: { cuentaContable: true },
    });

    const factorUfv = 1.01253; // Factor de ajuste UFV según norma boliviana D.S. 24051

    return this.prisma.$transaction(async (tx) => {
      // Registrar cierre por cada activo
      for (const a of activos) {
        const pIni = Number(a.precioInicial);
        const incAct = Number((pIni * (factorUfv - 1)).toFixed(2));
        const valAct = pIni + incAct;
        const depGest = Number((valAct * 0.25).toFixed(2));
        const depAcum = depGest;
        const neto = Math.max(1, Number((valAct - depAcum).toFixed(2)));

        await tx.cierreActivo.create({
          data: {
            gestionId: gestion.id,
            activoId: a.id,
            valorInicial: pIni,
            factorActualizacion: factorUfv,
            incrementoActualizado: incAct,
            depreciacionGestion: depGest,
            depreciacionAcumulada: depAcum,
            valorResidualNeto: neto,
          },
        });
      }

      // Marcar gestión como cerrada
      const gestionCerrada = await tx.gestion.update({
        where: { id: gestion.id },
        data: {
          cerrado: true,
          fechaCierre: new Date(),
          cerradoPorId: userId,
        },
        include: {
          cerradoPor: {
            select: { id: true, nombres: true, apellidos: true, username: true },
          },
        },
      });

      // Crear automáticamente la gestión siguiente abierta si no existe
      const siguienteAnio = anio + 1;
      const existeSiguiente = await tx.gestion.findUnique({ where: { anio: siguienteAnio } });
      if (!existeSiguiente) {
        await tx.gestion.create({
          data: {
            anio: siguienteAnio,
            cerrado: false,
          },
        });
      }

      return {
        mensaje: `Gestión ${anio} cerrada exitosamente con ${activos.length} activos consolidados.`,
        gestion: gestionCerrada,
        totalActivosCerrados: activos.length,
      };
    });
  }

  async listarUfvs(limit = 60) {
    return this.prisma.ufv.findMany({
      orderBy: { fecha: 'desc' },
      take: limit,
    });
  }

  async registrarUfv(dto: RegistrarUfvDto) {
    const fechaObj = new Date(dto.fecha);
    const fechaSinHora = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate());

    return this.prisma.ufv.upsert({
      where: { fecha: fechaSinHora },
      create: {
        fecha: fechaSinHora,
        valor: dto.valor,
      },
      update: {
        valor: dto.valor,
      },
    });
  }
}

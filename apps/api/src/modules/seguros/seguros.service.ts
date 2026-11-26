import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSeguroDto {
  numeroPoliza: string;
  aseguradora: string;
  fechaInicio: string | Date;
  fechaFin: string | Date;
  cobertura?: string;
  activoIds?: string[];
}

export interface UpdateSeguroDto {
  numeroPoliza?: string;
  aseguradora?: string;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
  cobertura?: string;
  activo?: boolean;
}

@Injectable()
export class SegurosService {
  constructor(private readonly prisma: PrismaService) {}

  private calcularEstadoYAlerta(fechaInicio: Date, fechaFin: Date, activo: boolean) {
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const fin = new Date(fechaFin);
    const ini = new Date(fechaInicio);

    const diffTiempo = fin.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

    if (!activo) {
      return { estado: 'INACTIVO', nivelAlerta: 'INACTIVO', diasRestantes, parpadeo: false, mensaje: 'Póliza desactivada' };
    }

    if (diasRestantes < 0) {
      return { estado: 'VENCIDO', nivelAlerta: 'VENCIDO', diasRestantes, parpadeo: false, mensaje: `Póliza vencida hace ${Math.abs(diasRestantes)} días` };
    }

    if (diasRestantes <= 7) {
      return { estado: 'POR_VENCER', nivelAlerta: 'URGENTE_7_DIAS', diasRestantes, parpadeo: true, mensaje: `URGENTE: Vence en ${diasRestantes} días` };
    }

    if (diasRestantes <= 30) {
      return { estado: 'POR_VENCER', nivelAlerta: 'ALERTA_30_DIAS', diasRestantes, parpadeo: false, mensaje: `Alerta: Vence en ${diasRestantes} días` };
    }

    if (diasRestantes <= 90) {
      return { estado: 'VIGENTE', nivelAlerta: 'AVISO_90_DIAS', diasRestantes, parpadeo: false, mensaje: `Aviso preventivo: Vence en ${diasRestantes} días` };
    }

    return { estado: 'VIGENTE', nivelAlerta: 'NORMAL', diasRestantes, parpadeo: false, mensaje: `Vigente por ${diasRestantes} días más` };
  }

  async findAll() {
    const seguros = await this.prisma.seguro.findMany({
      include: {
        activos: {
          include: {
            activo: {
              select: {
                id: true,
                codigoBarras: true,
                descripcion: true,
                precioInicial: true,
                estado: true,
              },
            },
          },
        },
      },
      orderBy: { fechaFin: 'asc' },
    });

    return seguros.map((s) => {
      const alerta = this.calcularEstadoYAlerta(s.fechaInicio, s.fechaFin, s.activo);
      const valorAsegurado = s.activos.reduce((acc, a) => acc + Number(a.activo.precioInicial || 0), 0);
      return {
        ...s,
        totalActivos: s.activos.length,
        valorAsegurado,
        ...alerta,
      };
    });
  }

  async findOne(id: string) {
    const s = await this.prisma.seguro.findUnique({
      where: { id },
      include: {
        activos: {
          include: {
            activo: {
              include: {
                cuentaContable: true,
                usuarioCustodio: true,
              },
            },
          },
        },
      },
    }) as any;

    if (!s) {
      throw new NotFoundException(`Seguro con ID ${id} no encontrado`);
    }

    const alerta = this.calcularEstadoYAlerta(s.fechaInicio, s.fechaFin, s.activo);
    const activosLista = s.activos || [];
    const valorAsegurado = activosLista.reduce((acc: number, a: any) => acc + Number(a.activo?.precioInicial || 0), 0);

    return {
      ...s,
      totalActivos: activosLista.length,
      valorAsegurado,
      ...alerta,
    };
  }

  async create(dto: CreateSeguroDto) {
    const fechaIni = new Date(dto.fechaInicio);
    const fechaF = new Date(dto.fechaFin);

    if (fechaF <= fechaIni) {
      throw new BadRequestException('La fecha de fin de vigencia debe ser posterior a la fecha de inicio');
    }

    const seguro = await this.prisma.seguro.create({
      data: {
        numeroPoliza: dto.numeroPoliza.trim(),
        aseguradora: dto.aseguradora.trim(),
        fechaInicio: fechaIni,
        fechaFin: fechaF,
        cobertura: dto.cobertura?.trim() || null,
        activo: true,
      },
    });

    if (dto.activoIds && dto.activoIds.length > 0) {
      const vinculaciones = dto.activoIds.map((activoId) => ({
        activoId,
        seguroId: seguro.id,
      }));
      await this.prisma.activoSeguro.createMany({
        data: vinculaciones,
        skipDuplicates: true,
      });
    }

    return this.findOne(seguro.id);
  }

  async update(id: string, dto: UpdateSeguroDto) {
    const existente = await this.prisma.seguro.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Póliza no encontrada');

    const updateData: any = {};
    if (dto.numeroPoliza) updateData.numeroPoliza = dto.numeroPoliza.trim();
    if (dto.aseguradora) updateData.aseguradora = dto.aseguradora.trim();
    if (dto.fechaInicio) updateData.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) updateData.fechaFin = new Date(dto.fechaFin);
    if (dto.cobertura !== undefined) updateData.cobertura = dto.cobertura ? dto.cobertura.trim() : null;
    if (dto.activo !== undefined) updateData.activo = Boolean(dto.activo);

    await this.prisma.seguro.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  async vincularActivos(seguroId: string, activoIds: string[]) {
    const seguro = await this.prisma.seguro.findUnique({ where: { id: seguroId } });
    if (!seguro) throw new NotFoundException('Póliza no encontrada');

    if (!activoIds || activoIds.length === 0) {
      throw new BadRequestException('Debe proporcionar al menos un activo');
    }

    const vinculaciones = activoIds.map((activoId) => ({
      seguroId,
      activoId,
    }));

    await this.prisma.activoSeguro.createMany({
      data: vinculaciones,
      skipDuplicates: true,
    });

    return this.findOne(seguroId);
  }

  async desvincularActivo(seguroId: string, activoId: string) {
    await this.prisma.activoSeguro.deleteMany({
      where: {
        seguroId,
        activoId,
      },
    });
    return this.findOne(seguroId);
  }

  async obtenerAlertasVencimiento() {
    const todos = await this.findAll();

    const vencidos = todos.filter((s) => s.nivelAlerta === 'VENCIDO');
    const urgente7 = todos.filter((s) => s.nivelAlerta === 'URGENTE_7_DIAS');
    const alerta30 = todos.filter((s) => s.nivelAlerta === 'ALERTA_30_DIAS');
    const aviso90 = todos.filter((s) => s.nivelAlerta === 'AVISO_90_DIAS');
    const vigentes = todos.filter((s) => s.nivelAlerta === 'NORMAL');

    return {
      totalPolizas: todos.length,
      resumen: {
        vencidos: vencidos.length,
        urgente7Dias: urgente7.length,
        alerta30Dias: alerta30.length,
        aviso90Dias: aviso90.length,
        vigentesNormales: vigentes.length,
      },
      polizasCriticas: [...urgente7, ...alerta30, ...vencidos],
    };
  }
}

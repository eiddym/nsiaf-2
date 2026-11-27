import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { CreateIngresoActivoDto } from './dto/create-ingreso.dto';
import { CreateActaDto } from './dto/create-acta.dto';
import { TipoActa } from '@prisma/client';
import * as QRCode from 'qrcode';

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

  async create(dto: CreateActivoDto) {
    const exists = await this.prisma.activo.findUnique({
      where: { codigoBarras: dto.codigoBarras },
    });
    if (exists) {
      throw new BadRequestException(`Ya existe un activo con el código de barras ${dto.codigoBarras}`);
    }

    return this.prisma.activo.create({
      data: {
        codigoBarras: dto.codigoBarras,
        descripcion: dto.descripcion,
        detalle: dto.detalle,
        marca: dto.marca,
        modelo: dto.modelo,
        serie: dto.serie,
        color: dto.color,
        material: dto.material,
        medidas: dto.medidas,
        estado: dto.estado,
        precioInicial: dto.precioInicial,
        valorResidual: dto.valorResidual ?? 1.0,
        vidaUtilRestanteMeses: dto.vidaUtilRestanteMeses ?? 0,
        cuentaContableId: dto.cuentaContableId,
        auxiliarId: dto.auxiliarId,
        usuarioCustodioId: dto.usuarioCustodioId,
        ubicacion: dto.ubicacion,
        ingresoId: dto.ingresoId,
      },
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
    });
  }

  async update(id: string, dto: UpdateActivoDto) {
    await this.findOne(id);
    return this.prisma.activo.update({
      where: { id },
      data: dto,
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
    });
  }

  async createIngreso(dto: CreateIngresoActivoDto, userId: string) {
    // Calcular total
    const total = dto.items.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener la sigla de la entidad para el prefijo de código de barras
      const entidad = await tx.entidad.findFirst();
      const sigla = entidad?.sigla || 'NSIAF';

      // 2. Crear cabecera de ingreso
      const ingreso = await tx.ingresoActivo.create({
        data: {
          fecha: new Date(dto.fecha),
          tipoIngreso: dto.tipoIngreso,
          proveedorId: dto.proveedorId,
          facturaNumero: dto.facturaNumero,
          facturaAutorizacion: dto.facturaAutorizacion,
          facturaFecha: dto.facturaFecha ? new Date(dto.facturaFecha) : null,
          nroC31: dto.nroC31,
          notaEntregaNumero: dto.notaEntregaNumero,
          documentoCite: dto.documentoCite,
          entidadDonante: dto.entidadDonante,
          total,
          observacion: dto.observacion,
          creadoPorId: userId,
        },
      });

      // 3. Crear activos individuales por cada ítem y cantidad
      const activosCreados = [];
      const ultimoActivo = await tx.activo.findFirst({
        orderBy: { codigo: 'desc' },
      });
      let nextCodigo = (ultimoActivo?.codigo || 0) + 1;

      for (const item of dto.items) {
        // Obtener código de la cuenta contable
        const cuenta = await tx.cuentaContable.findUnique({
          where: { id: item.cuentaContableId },
        });
        const cuentaCodigo = cuenta?.codigo || 12000;
        const vidaUtil = cuenta?.vidaUtilMeses || 48;

        for (let i = 0; i < item.cantidad; i++) {
          const barcode = `${sigla}-${cuentaCodigo}-${String(nextCodigo).padStart(5, '0')}`;

          const nuevoActivo = await tx.activo.create({
            data: {
              codigo: nextCodigo,
              codigoBarras: barcode,
              descripcion: item.descripcion,
              detalle: item.detalle,
              marca: item.marca,
              modelo: item.modelo,
              color: item.color,
              precioInicial: item.precioUnitario,
              valorResidual: 1.0,
              vidaUtilRestanteMeses: vidaUtil,
              cuentaContableId: item.cuentaContableId,
              auxiliarId: item.auxiliarId,
              ubicacion: item.ubicacion,
              ingresoId: ingreso.id,
            },
          });

          activosCreados.push(nuevoActivo);
          nextCodigo++;
        }
      }

      return {
        ingreso,
        totalActivosCreados: activosCreados.length,
        activos: activosCreados,
      };
    });
  }

  async createActa(dto: CreateActaDto, responsableId: string) {
    if (!dto.activoIds || dto.activoIds.length === 0) {
      throw new BadRequestException('Debe incluir al menos un activo fijo en el acta');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear Acta
      const acta = await tx.acta.create({
        data: {
          tipo: dto.tipo,
          usuarioFuncionarioId: dto.usuarioFuncionarioId,
          usuarioResponsableId: responsableId,
          documentoCite: dto.documentoCite,
          observaciones: dto.observaciones,
        },
      });

      // 2. Asociar Activos
      for (const activoId of dto.activoIds) {
        await tx.actaDetalle.create({
          data: {
            actaId: acta.id,
            activoId,
          },
        });

        // 3. Si es Entrega o Transferencia, actualizamos custodio; si es Devolución, se quita custodio
        if (dto.tipo === TipoActa.ENTREGA || dto.tipo === TipoActa.TRANSFERENCIA) {
          await tx.activo.update({
            where: { id: activoId },
            data: { usuarioCustodioId: dto.usuarioFuncionarioId },
          });
        } else if (dto.tipo === TipoActa.DEVOLUCION) {
          await tx.activo.update({
            where: { id: activoId },
            data: { usuarioCustodioId: null },
          });
        }
      }

      return tx.acta.findUnique({
        where: { id: acta.id },
        include: {
          usuarioFuncionario: true,
          usuarioResponsable: true,
          detalles: {
            include: {
              activo: true,
            },
          },
        },
      });
    });
  }

  async listActas(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.acta.count(),
      this.prisma.acta.findMany({
        skip,
        take: limit,
        include: {
          usuarioFuncionario: { select: { nombres: true, apellidos: true, ci: true, cargo: true } },
          usuarioResponsable: { select: { nombres: true, apellidos: true } },
          detalles: { include: { activo: { select: { codigoBarras: true, descripcion: true } } } },
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

  async getEstadisticas() {
    const [totalActivos, porEstado, cuentas] = await Promise.all([
      this.prisma.activo.count(),
      this.prisma.activo.groupBy({
        by: ['estado'],
        _count: { id: true },
      }),
      this.prisma.cuentaContable.findMany({
        include: {
          _count: { select: { activos: true } },
        },
      }),
    ]);

    const activosPrecios = await this.prisma.activo.findMany({
      select: { precioInicial: true },
    });

    const valorTotal = activosPrecios.reduce(
      (sum, a) => sum + Number(a.precioInicial),
      0,
    );

    return {
      totalActivos,
      valorTotal,
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: e._count.id,
      })),
      porCuenta: cuentas.map((c) => ({
        cuenta: c.nombre,
        codigo: c.codigo,
        cantidad: c._count.activos,
      })),
    };
  }

  async obtenerReporteDepreciacion(cuentaId?: string) {
    const where: any = {};
    if (cuentaId) {
      where.cuentaContableId = cuentaId;
    }

    const activos = await this.prisma.activo.findMany({
      where,
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
      orderBy: { codigo: 'asc' },
    });

    const factorUfv = 1.01253; // Factor UFV oficial de cierre de gestión

    return activos.map((a) => {
      const precioIni = Number(a.precioInicial);
      const incAct = Number((precioIni * (factorUfv - 1)).toFixed(2));
      const valAct = Number((precioIni + incAct).toFixed(2));
      const mesesVida = a.vidaUtilRestanteMeses || 48;
      const aniosVida = mesesVida > 0 ? mesesVida / 12 : 4;
      const depGestion = Number((valAct / aniosVida).toFixed(2));
      const depAcum = depGestion;
      const valNeto = Math.max(1, Number((valAct - depAcum).toFixed(2)));

      return {
        id: a.id,
        codigoBarras: a.codigoBarras,
        descripcion: a.descripcion,
        cuentaContable: a.cuentaContable.nombre,
        cuentaCodigo: a.cuentaContable.codigo,
        auxiliar: a.auxiliar.nombre,
        precioInicial: precioIni,
        factorUfv,
        incrementoActualizacion: incAct,
        valorActualizado: valAct,
        depreciacionGestion: depGestion,
        depreciacionAcumulada: depAcum,
        valorNeto: valNeto,
        custodio: a.usuarioCustodio ? `${a.usuarioCustodio.nombres} ${a.usuarioCustodio.apellidos}` : 'En Depósito',
      };
    });
  }

  async obtenerReporteResumen() {
    const cuentas = await this.prisma.cuentaContable.findMany({
      include: {
        activos: {
          select: { precioInicial: true },
        },
      },
      orderBy: { codigo: 'asc' },
    });

    const factorUfv = 1.01253;

    return cuentas.map((c) => {
      const cantidad = c.activos.length;
      const totalInicial = c.activos.reduce((acc, a) => acc + Number(a.precioInicial), 0);
      const totalIncAct = Number((totalInicial * (factorUfv - 1)).toFixed(2));
      const totalActualizado = totalInicial + totalIncAct;
      const totalDepreciacion = Number((totalActualizado * 0.25).toFixed(2));
      const totalNeto = Math.max(cantidad, totalActualizado - totalDepreciacion);

      return {
        codigo: c.codigo,
        cuenta: c.nombre,
        cantidad,
        totalInicial,
        factorUfv,
        totalIncAct,
        totalActualizado,
        totalDepreciacion,
        totalNeto,
      };
    });
  }

  async obtenerReporteBajas() {
    return this.prisma.activo.findMany({
      where: {
        bajaId: { not: null },
      },
      include: {
        cuentaContable: true,
        baja: true,
      },
      orderBy: { codigo: 'desc' },
    });
  }

  async obtenerActivosPorCustodio(funcionarioId: string) {
    const funcionario = await this.prisma.usuario.findUnique({
      where: { id: funcionarioId },
      include: {
        unidad: true,
        activosCustodia: {
          include: {
            cuentaContable: true,
            auxiliar: true,
          },
        },
      },
    });

    if (!funcionario) {
      throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);
    }

    return funcionario;
  }

  async verificarActivo(identificador: string) {
    const activo = await this.prisma.activo.findFirst({
      where: {
        OR: [
          { codigoBarras: identificador },
          { id: identificador },
          { codigo: parseInt(identificador, 10) || undefined },
        ],
      },
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: {
          include: { unidad: true },
        },
        baja: true,
      },
    });

    if (!activo) {
      throw new NotFoundException(`No se encontró ningún activo con el identificador QR: ${identificador}`);
    }

    const verificationPayload = {
      identificacionGlobal: {
        sistema: 'NSIAF v2 - Sistema Integrado de Activos Fijos',
        codigoQr: activo.codigoBarras,
        uuid: activo.id,
        verifUrl: `http://localhost:8086/verificar/activo/${activo.codigoBarras}`,
      },
      activo: {
        id: activo.id,
        codigo: activo.codigo,
        codigoBarras: activo.codigoBarras,
        descripcion: activo.descripcion,
        detalle: activo.detalle,
        marca: activo.marca,
        modelo: activo.modelo,
        serie: activo.serie,
        color: activo.color,
        material: activo.material,
        medidas: activo.medidas,
        estado: activo.estado,
        precioInicial: Number(activo.precioInicial),
        ubicacion: activo.ubicacion,
        cuentaContable: activo.cuentaContable?.nombre,
        auxiliar: activo.auxiliar?.nombre,
      },
      asociacionEmpleado: {
        asignado: !!activo.usuarioCustodio,
        custodioNombre: activo.usuarioCustodio
          ? `${activo.usuarioCustodio.nombres} ${activo.usuarioCustodio.apellidos}`
          : 'En Depósito / Sin Asignar',
        ci: activo.usuarioCustodio?.ci || 'N/A',
        cargo: activo.usuarioCustodio?.cargo || 'N/A',
        unidad: activo.usuarioCustodio?.unidad?.nombre || 'Dirección de Administración',
      },
      estadoLegal: activo.baja ? 'DADO_DE_BAJA' : (activo.usuarioCustodio ? 'ASIGNADO' : 'DISPONIBLE'),
      fechaVerificacion: new Date().toISOString(),
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(verificationPayload.identificacionGlobal), {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });

    return {
      ...verificationPayload,
      qrDataUrl,
    };
  }

  async generarQrActivo(identificador: string): Promise<string> {
    const res = await this.verificarActivo(identificador);
    return res.qrDataUrl;
  }

  async registrarVerificacionFisica(identificador: string, dto: {
    estado: any;
    estadoVigencia: string;
    observaciones?: string;
    ubicacionFisica?: string;
    verificador?: string;
  }) {
    const activo = await this.prisma.activo.findFirst({
      where: {
        OR: [
          { id: identificador },
          { codigoBarras: identificador },
        ],
      },
      include: {
        usuarioCustodio: { include: { unidad: true } },
        cuentaContable: true,
        auxiliar: true,
      },
    });

    if (!activo) {
      throw new NotFoundException(`No se encontró el activo ${identificador}`);
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const verificadorTxt = dto.verificador ? ` por ${dto.verificador}` : '';
    const notaVerif = `[INSP. ${fechaHoy}${verificadorTxt} - ${dto.estadoVigencia} (${dto.estado})]: ${dto.observaciones || 'Verificado en terreno'}`;

    const updated = await this.prisma.activo.update({
      where: { id: activo.id },
      data: {
        estado: dto.estado,
        detalle: notaVerif,
        ...(dto.ubicacionFisica ? { ubicacion: dto.ubicacionFisica } : {}),
      },
      include: {
        usuarioCustodio: { include: { unidad: true } },
        cuentaContable: true,
        auxiliar: true,
      },
    });

    return {
      success: true,
      mensaje: `Activo ${updated.codigoBarras} verificado y registrado exitosamente como ${dto.estadoVigencia}`,
      fechaVerificacion: new Date().toISOString(),
      activoActualizado: {
        id: updated.id,
        codigoBarras: updated.codigoBarras,
        descripcion: updated.descripcion,
        estado: updated.estado,
        estadoVigencia: dto.estadoVigencia,
        detalle: updated.detalle,
        ubicacion: updated.ubicacion,
      },
    };
  }

  // ==========================================
  // CUENTAS CONTABLES Y AUXILIARES (GRUPO 40000)
  // ==========================================

  async listarCuentasContables() {
    return this.prisma.cuentaContable.findMany({
      include: {
        auxiliares: { orderBy: { codigo: 'asc' } },
        _count: { select: { activos: true } },
      },
      orderBy: { codigo: 'asc' },
    });
  }

  async crearCuentaContable(dto: {
    codigo: number;
    nombre: string;
    vidaUtilMeses: number;
    depreciar?: boolean;
    actualizar?: boolean;
  }) {
    const dup = await this.prisma.cuentaContable.findUnique({ where: { codigo: Number(dto.codigo) } });
    if (dup) throw new BadRequestException(`Ya existe la cuenta contable con código ${dto.codigo}`);

    return this.prisma.cuentaContable.create({
      data: {
        codigo: Number(dto.codigo),
        nombre: dto.nombre.trim(),
        vidaUtilMeses: Number(dto.vidaUtilMeses) || 0,
        depreciar: dto.depreciar ?? true,
        actualizar: dto.actualizar ?? true,
      },
      include: { auxiliares: true },
    });
  }

  async crearAuxiliar(cuentaContableId: string, dto: { codigo: number; nombre: string }) {
    const cuenta = await this.prisma.cuentaContable.findUnique({ where: { id: cuentaContableId } });
    if (!cuenta) throw new NotFoundException('Cuenta contable no encontrada');

    return this.prisma.auxiliar.create({
      data: {
        cuentaContableId,
        codigo: Number(dto.codigo),
        nombre: dto.nombre.trim(),
      },
    });
  }

  // ==========================================
  // BAJAS DE ACTIVOS FIJOS
  // ==========================================

  async listarBajas() {
    return this.prisma.bajaActivo.findMany({
      include: {
        usuario: { select: { id: true, nombres: true, apellidos: true, username: true } },
        activosDadosDeBaja: {
          include: { cuentaContable: true },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async registrarBaja(
    dto: {
      activoIds: string[];
      motivo: string;
      documentoCite?: string;
      observacion?: string;
      fecha?: string;
    },
    userId: string,
  ) {
    if (!dto.activoIds || dto.activoIds.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos un activo para dar de baja.');
    }
    if (!dto.motivo?.trim()) {
      throw new BadRequestException('El motivo de baja es obligatorio.');
    }

    return this.prisma.$transaction(async (tx) => {
      const baja = await tx.bajaActivo.create({
        data: {
          fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
          motivo: dto.motivo.trim(),
          documentoCite: dto.documentoCite?.trim() || null,
          observacion: dto.observacion?.trim() || null,
          usuarioId: userId,
        },
      });

      await tx.activo.updateMany({
        where: { id: { in: dto.activoIds } },
        data: {
          bajaId: baja.id,
          usuarioCustodioId: null,
        },
      });

      await tx.auditoria.create({
        data: {
          tabla: 'bajas_activos',
          registroId: baja.id,
          accion: 'CREATE',
          datosNuevos: { motivo: baja.motivo, activos: dto.activoIds, documentoCite: baja.documentoCite } as any,
          usuarioId: userId,
        },
      });

      return tx.bajaActivo.findUnique({
        where: { id: baja.id },
        include: {
          usuario: { select: { id: true, nombres: true, apellidos: true } },
          activosDadosDeBaja: true,
        },
      });
    });
  }

  // ==========================================
  // BANDEJA DE SOLICITUDES DE ACTIVOS (DE FUNCIONARIOS)
  // ==========================================

  async listarSolicitudesActivos(estado?: string) {
    return this.prisma.solicitudActivo.findMany({
      where: estado ? { estado: estado as any } : {},
      include: {
        solicitante: {
          select: {
            id: true,
            ci: true,
            nombres: true,
            apellidos: true,
            cargo: true,
            unidad: { select: { nombre: true, sigla: true } },
          },
        },
        activo: {
          select: { id: true, codigoBarras: true, descripcion: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async actualizarEstadoSolicitudActivo(
    id: string,
    estado: 'APROBADA' | 'ENTREGADA' | 'RECHAZADA' | 'ANULADA',
    observacion?: string,
  ) {
    const sol = await this.prisma.solicitudActivo.findUnique({ where: { id } });
    if (!sol) throw new NotFoundException('Solicitud de activo no encontrada');

    return this.prisma.solicitudActivo.update({
      where: { id },
      data: {
        estado: estado as any,
        ...(observacion !== undefined ? { observacion } : {}),
      },
      include: {
        solicitante: { select: { id: true, nombres: true, apellidos: true } },
        activo: { select: { id: true, codigoBarras: true, descripcion: true } },
      },
    });
  }
}

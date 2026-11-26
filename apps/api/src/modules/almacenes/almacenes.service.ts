import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIngresoAlmacenDto } from './dto/create-ingreso-almacen.dto';
import { CreateSolicitudAlmacenDto } from './dto/create-solicitud-almacen.dto';
import { CreateSubarticuloDto } from './dto/create-subarticulo.dto';
import { CreateAlmacenDto } from './dto/create-almacen.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { TipoMovimientoKardex, EstadoSolicitud } from '@prisma/client';

@Injectable()
export class AlmacenesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // GESTIÓN DE ALMACENES Y SUB-ALMACENES (SUCURSALES)
  // ==========================================

  async listarAlmacenes() {
    return this.prisma.almacen.findMany({
      include: {
        almacenPadre: { select: { id: true, codigo: true, nombre: true } },
        subalmacenes: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            direccion: true,
            responsable: { select: { nombres: true, apellidos: true } },
            _count: { select: { stocks: true } },
          },
        },
        responsable: { select: { id: true, ci: true, nombres: true, apellidos: true, cargo: true } },
        edificio: { select: { id: true, nombre: true } },
        _count: { select: { stocks: true, solicitudes: true } },
      },
      orderBy: [{ esCentral: 'desc' }, { nombre: 'asc' }],
    });
  }

  async crearAlmacen(dto: CreateAlmacenDto) {
    const exists = await this.prisma.almacen.findUnique({
      where: { codigo: dto.codigo },
    });
    if (exists) {
      throw new BadRequestException(`El almacén con código ${dto.codigo} ya existe`);
    }

    return this.prisma.almacen.create({
      data: dto,
      include: {
        almacenPadre: true,
        responsable: { select: { nombres: true, apellidos: true } },
      },
    });
  }

  async obtenerStocksPorAlmacen(almacenId: string) {
    const almacen = await this.prisma.almacen.findUnique({
      where: { id: almacenId },
    });
    if (!almacen) {
      throw new NotFoundException(`Almacén ${almacenId} no encontrado`);
    }

    const stocks = await this.prisma.stockAlmacen.findMany({
      where: { almacenId },
      include: {
        subarticulo: {
          include: { material: true },
        },
      },
      orderBy: { subarticulo: { codigo: 'asc' } },
    });

    return {
      almacen,
      stocks,
    };
  }

  async crearTraspaso(dto: CreateTraspasoDto, userId: string) {
    if (dto.almacenOrigenId === dto.almacenDestinoId) {
      throw new BadRequestException('El almacén de origen y destino deben ser diferentes');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un suministro en el traspaso');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validar almacenes
      const [origen, destino] = await Promise.all([
        tx.almacen.findUnique({ where: { id: dto.almacenOrigenId } }),
        tx.almacen.findUnique({ where: { id: dto.almacenDestinoId } }),
      ]);

      if (!origen) throw new NotFoundException('Almacén de origen no existe');
      if (!destino) throw new NotFoundException('Sub-almacén de destino no existe');

      // 2. Crear cabecera de traspaso
      const traspaso = await tx.traspasoAlmacen.create({
        data: {
          almacenOrigenId: dto.almacenOrigenId,
          almacenDestinoId: dto.almacenDestinoId,
          documentoCite: dto.documentoCite,
          motivo: dto.motivo,
          creadoPorId: userId,
        },
      });

      // 3. Procesar cada ítem
      for (const item of dto.items) {
        const subarticulo = await tx.subarticulo.findUnique({
          where: { id: item.subarticuloId },
        });
        if (!subarticulo) {
          throw new NotFoundException(`Subartículo ${item.subarticuloId} no encontrado`);
        }

        // Buscar stock en origen
        let stockOrigen = await tx.stockAlmacen.findUnique({
          where: {
            almacenId_subarticuloId: {
              almacenId: dto.almacenOrigenId,
              subarticuloId: item.subarticuloId,
            },
          },
        });

        const stockOrigenActual = stockOrigen ? Number(stockOrigen.stockActual) : 0;
        if (stockOrigenActual < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente en ${origen.nombre} para ${subarticulo.descripcion}. Disponible: ${stockOrigenActual}, solicitado para traspaso: ${item.cantidad}`,
          );
        }

        const costoUnit = Number(subarticulo.costoUnitarioPromedio);
        const costoTotal = item.cantidad * costoUnit;

        // Descontar en origen
        const nuevoStockOrigen = stockOrigenActual - item.cantidad;
        await tx.stockAlmacen.update({
          where: { id: stockOrigen!.id },
          data: { stockActual: nuevoStockOrigen },
        });

        // Incrementar en destino
        const stockDestino = await tx.stockAlmacen.upsert({
          where: {
            almacenId_subarticuloId: {
              almacenId: dto.almacenDestinoId,
              subarticuloId: item.subarticuloId,
            },
          },
          update: {
            stockActual: { increment: item.cantidad },
            costoPromedio: costoUnit,
          },
          create: {
            almacenId: dto.almacenDestinoId,
            subarticuloId: item.subarticuloId,
            stockActual: item.cantidad,
            costoPromedio: costoUnit,
            stockMinimo: 5,
          },
        });

        // Detalle de traspaso
        await tx.detalleTraspasoAlmacen.create({
          data: {
            traspasoId: traspaso.id,
            subarticuloId: item.subarticuloId,
            cantidad: item.cantidad,
            costoUnitario: costoUnit,
            costoTotal,
          },
        });

        // Kardex en Origen (SALIDA TRASPASO)
        await tx.kardexAlmacen.create({
          data: {
            almacenId: dto.almacenOrigenId,
            subarticuloId: item.subarticuloId,
            tipoMovimiento: TipoMovimientoKardex.TRASPASO_SALIDA,
            referenciaTipo: 'TRASPASO',
            referenciaId: traspaso.id,
            documentoCite: dto.documentoCite,
            cantidad: item.cantidad,
            costoUnitario: costoUnit,
            costoTotal,
            saldoCantidad: nuevoStockOrigen,
            saldoCostoTotal: nuevoStockOrigen * costoUnit,
          },
        });

        // Kardex en Destino (ENTRADA TRASPASO)
        const nuevoStockDestino = Number(stockDestino.stockActual);
        await tx.kardexAlmacen.create({
          data: {
            almacenId: dto.almacenDestinoId,
            subarticuloId: item.subarticuloId,
            tipoMovimiento: TipoMovimientoKardex.TRASPASO_ENTRADA,
            referenciaTipo: 'TRASPASO',
            referenciaId: traspaso.id,
            documentoCite: dto.documentoCite,
            cantidad: item.cantidad,
            costoUnitario: costoUnit,
            costoTotal,
            saldoCantidad: nuevoStockDestino,
            saldoCostoTotal: nuevoStockDestino * costoUnit,
          },
        });
      }

      return tx.traspasoAlmacen.findUnique({
        where: { id: traspaso.id },
        include: {
          almacenOrigen: true,
          almacenDestino: true,
          detalles: { include: { subarticulo: true } },
        },
      });
    });
  }

  async listarTraspasos() {
    return this.prisma.traspasoAlmacen.findMany({
      include: {
        almacenOrigen: { select: { nombre: true, codigo: true } },
        almacenDestino: { select: { nombre: true, codigo: true } },
        creadoPor: { select: { nombres: true, apellidos: true } },
        detalles: { include: { subarticulo: true } },
      },
      orderBy: { numero: 'desc' },
    });
  }

  // ==========================================
  // CATÁLOGO Y KARDEX DE SUBARTÍCULOS
  // ==========================================

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
          stocks: {
            include: {
              almacen: { select: { id: true, nombre: true, codigo: true, esCentral: true } },
            },
          },
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

  async getKardex(subarticuloId: string, almacenId?: string) {
    const subarticulo = await this.prisma.subarticulo.findUnique({
      where: { id: subarticuloId },
      include: { material: true },
    });

    if (!subarticulo) {
      throw new NotFoundException(`Subartículo con ID ${subarticuloId} no encontrado`);
    }

    const where = almacenId ? { subarticuloId, almacenId } : { subarticuloId };

    const movimientos = await this.prisma.kardexAlmacen.findMany({
      where,
      include: {
        almacen: { select: { nombre: true, codigo: true } },
      },
      orderBy: { fecha: 'asc' },
    });

    return {
      subarticulo,
      movimientos,
    };
  }

  async createSubarticulo(dto: CreateSubarticuloDto) {
    const exists = await this.prisma.subarticulo.findUnique({
      where: { codigo: dto.codigo },
    });

    if (exists) {
      throw new BadRequestException(`El subartículo con código ${dto.codigo} ya existe`);
    }

    return this.prisma.subarticulo.create({
      data: dto,
      include: { material: true },
    });
  }

  async createIngreso(dto: CreateIngresoAlmacenDto, userId: string) {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('El ingreso debe contener al menos un detalle de suministro');
    }

    // Por defecto, las compras ingresan al Almacén Central
    const almCentral = await this.prisma.almacen.findFirst({
      where: { esCentral: true },
    });
    const almacenId = almCentral?.id;

    const total = dto.detalles.reduce((acc, d) => acc + d.cantidad * d.costoUnitario, 0);

    return this.prisma.$transaction(async (tx) => {
      // 1. Cabecera del ingreso
      const ingreso = await tx.ingresoAlmacen.create({
        data: {
          fecha: new Date(dto.fecha),
          tipoIngreso: dto.tipoIngreso,
          almacenId,
          proveedorId: dto.proveedorId,
          facturaNumero: dto.facturaNumero,
          facturaFecha: dto.facturaFecha ? new Date(dto.facturaFecha) : null,
          notaEntregaNumero: dto.notaEntregaNumero,
          nroC31: dto.nroC31,
          documentoCite: dto.documentoCite,
          entidadDonante: dto.entidadDonante,
          subtotal: total,
          total,
          observacion: dto.observacion,
          creadoPorId: userId,
        },
      });

      // 2. Procesar detalles
      for (const d of dto.detalles) {
        const subarticulo = await tx.subarticulo.findUnique({
          where: { id: d.subarticuloId },
        });

        if (!subarticulo) {
          throw new NotFoundException(`Subartículo ${d.subarticuloId} no existe`);
        }

        const costoTotalDetalle = d.cantidad * d.costoUnitario;

        await tx.detalleIngresoAlmacen.create({
          data: {
            ingresoId: ingreso.id,
            subarticuloId: d.subarticuloId,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            costoTotal: costoTotalDetalle,
            saldoLote: d.cantidad,
          },
        });

        // Ponderado global
        const oldStock = Number(subarticulo.stockActual);
        const oldCostoPromedio = Number(subarticulo.costoUnitarioPromedio);
        const newStock = oldStock + d.cantidad;
        const newSaldoTotal = oldStock * oldCostoPromedio + costoTotalDetalle;
        const newCostoPromedio = newStock > 0 ? newSaldoTotal / newStock : d.costoUnitario;

        await tx.subarticulo.update({
          where: { id: d.subarticuloId },
          data: {
            stockActual: newStock,
            costoUnitarioPromedio: newCostoPromedio,
          },
        });

        // Actualizar Stock en Almacén Central
        if (almacenId) {
          await tx.stockAlmacen.upsert({
            where: {
              almacenId_subarticuloId: {
                almacenId,
                subarticuloId: d.subarticuloId,
              },
            },
            update: {
              stockActual: { increment: d.cantidad },
              costoPromedio: newCostoPromedio,
            },
            create: {
              almacenId,
              subarticuloId: d.subarticuloId,
              stockActual: d.cantidad,
              costoPromedio: newCostoPromedio,
              stockMinimo: 10,
            },
          });
        }

        // Registrar en Kardex
        await tx.kardexAlmacen.create({
          data: {
            almacenId,
            subarticuloId: d.subarticuloId,
            tipoMovimiento: TipoMovimientoKardex.ENTRADA,
            referenciaTipo: 'INGRESO',
            referenciaId: ingreso.id,
            documentoCite: dto.documentoCite,
            cantidad: d.cantidad,
            costoUnitario: d.costoUnitario,
            costoTotal: costoTotalDetalle,
            saldoCantidad: newStock,
            saldoCostoTotal: newSaldoTotal,
          },
        });
      }

      return tx.ingresoAlmacen.findUnique({
        where: { id: ingreso.id },
        include: {
          proveedor: true,
          detalles: { include: { subarticulo: true } },
        },
      });
    });
  }

  async listSolicitudes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, data] = await Promise.all([
      this.prisma.solicitudAlmacen.count(),
      this.prisma.solicitudAlmacen.findMany({
        skip,
        take: limit,
        include: {
          almacen: { select: { nombre: true, codigo: true } },
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

  async createSolicitud(dto: CreateSolicitudAlmacenDto, solicitanteId: string) {
    if (!dto.detalles || dto.detalles.length === 0) {
      throw new BadRequestException('La solicitud debe especificar al menos un ítem');
    }

    // Por defecto asocia a almacén central si no se especifica
    const almCentral = await this.prisma.almacen.findFirst({
      where: { esCentral: true },
    });

    return this.prisma.solicitudAlmacen.create({
      data: {
        solicitanteId,
        almacenId: almCentral?.id,
        documentoCite: dto.documentoCite,
        observacion: dto.observacion,
        detalles: {
          create: dto.detalles.map((d) => ({
            subarticuloId: d.subarticuloId,
            cantidadSolicitada: d.cantidadSolicitada,
          })),
        },
      },
      include: {
        solicitante: { select: { nombres: true, apellidos: true, cargo: true } },
        detalles: { include: { subarticulo: true } },
      },
    });
  }

  async entregarSolicitud(solicitudId: string) {
    const solicitud = await this.prisma.solicitudAlmacen.findUnique({
      where: { id: solicitudId },
      include: { detalles: { include: { subarticulo: true } } },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud ${solicitudId} no encontrada`);
    }

    if (solicitud.estado === EstadoSolicitud.ENTREGADA) {
      throw new BadRequestException('Esta solicitud ya fue entregada previamente');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const d of solicitud.detalles) {
        const subarticulo = await tx.subarticulo.findUnique({
          where: { id: d.subarticuloId },
        });

        if (!subarticulo) {
          throw new NotFoundException(`Subartículo ${d.subarticuloId} no existe`);
        }

        const cantSolicitada = Number(d.cantidadSolicitada);
        const stockActual = Number(subarticulo.stockActual);

        if (stockActual < cantSolicitada) {
          throw new BadRequestException(
            `Stock insuficiente para ${subarticulo.descripcion}. Stock actual: ${stockActual}, solicitado: ${cantSolicitada}`,
          );
        }

        const newStock = stockActual - cantSolicitada;
        const costoUnit = Number(subarticulo.costoUnitarioPromedio);
        const costoTotalSalida = cantSolicitada * costoUnit;
        const newSaldoTotal = newStock * costoUnit;

        await tx.subarticulo.update({
          where: { id: d.subarticuloId },
          data: { stockActual: newStock },
        });

        if (solicitud.almacenId) {
          await tx.stockAlmacen.updateMany({
            where: {
              almacenId: solicitud.almacenId,
              subarticuloId: d.subarticuloId,
            },
            data: {
              stockActual: { decrement: cantSolicitada },
            },
          });
        }

        await tx.detalleSolicitudAlmacen.update({
          where: { id: d.id },
          data: {
            cantidadAprobada: cantSolicitada,
            cantidadEntregada: cantSolicitada,
          },
        });

        // Registrar salida en Kardex
        await tx.kardexAlmacen.create({
          data: {
            almacenId: solicitud.almacenId,
            subarticuloId: d.subarticuloId,
            tipoMovimiento: TipoMovimientoKardex.SALIDA,
            referenciaTipo: 'SOLICITUD',
            referenciaId: solicitud.id,
            documentoCite: solicitud.documentoCite,
            cantidad: cantSolicitada,
            costoUnitario: costoUnit,
            costoTotal: costoTotalSalida,
            saldoCantidad: newStock,
            saldoCostoTotal: newSaldoTotal,
          },
        });
      }

      return tx.solicitudAlmacen.update({
        where: { id: solicitud.id },
        data: {
          estado: EstadoSolicitud.ENTREGADA,
          fechaEntrega: new Date(),
        },
        include: {
          detalles: { include: { subarticulo: true } },
        },
      });
    });
  }
}

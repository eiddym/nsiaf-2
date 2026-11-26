import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumen(user: any) {
    const response: any = {
      usuario: {
        id: user.id,
        nombreCompleto: user.nombreCompleto || `${user.nombres} ${user.apellidos}`,
        rol: user.rol,
        accesoActivos: user.accesoActivos,
        accesoAlmacenes: user.accesoAlmacenes,
      },
      activos: null,
      almacenes: null,
      funcionario: null,
    };

    // Funcionario data (custody & requests for current logged-in user)
    const misActivos = await this.prisma.activo.count({
      where: { usuarioCustodioId: user.id, bajaId: null },
    });
    const misSolicitudesAlmacen = await this.prisma.solicitudAlmacen.count({
      where: { solicitanteId: user.id, estado: 'PENDIENTE' },
    });
    const misSolicitudesActivos = await this.prisma.solicitudActivo.count({
      where: { solicitanteId: user.id, estado: 'PENDIENTE' },
    });

    response.funcionario = {
      misActivosEnCustodia: misActivos,
      solicitudesPendientesTotal: misSolicitudesAlmacen + misSolicitudesActivos,
      solicitudesSuministrosPendientes: misSolicitudesAlmacen,
      solicitudesActivosPendientes: misSolicitudesActivos,
    };

    // Activos statistics
    if (user.accesoActivos || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') {
      const totalActivos = await this.prisma.activo.count();
      const activosDadosBaja = await this.prisma.activo.count({
        where: { bajaId: { not: null } },
      });
      const activosVigentes = await this.prisma.activo.count({
        where: { bajaId: null },
      });
      const activosAsignados = await this.prisma.activo.count({
        where: { bajaId: null, usuarioCustodioId: { not: null } },
      });
      const activosLibres = activosVigentes - activosAsignados;

      const estadoBueno = await this.prisma.activo.count({
        where: { estado: 'BUENO', bajaId: null },
      });
      const estadoRegular = await this.prisma.activo.count({
        where: { estado: 'REGULAR', bajaId: null },
      });
      const estadoMalo = await this.prisma.activo.count({
        where: { estado: 'MALO', bajaId: null },
      });

      const valorTotalAgg = await this.prisma.activo.aggregate({
        where: { bajaId: null },
        _sum: { precioInicial: true },
      });

      // Group by Rubro Contable
      const rubros = await this.prisma.cuentaContable.findMany({
        where: { activo: true },
        include: {
          activos: {
            where: { bajaId: null },
            select: { precioInicial: true },
          },
        },
      });

      const porRubro = rubros.map((r) => ({
        id: r.id,
        codigo: r.codigo,
        nombre: r.nombre,
        cantidad: r.activos.length,
        valorTotal: r.activos.reduce((acc, a) => acc + Number(a.precioInicial), 0),
      }));

      // Seguros por vencer (dentro de los próximos 30 días)
      const ahora = new Date();
      const en30Dias = new Date();
      en30Dias.setDate(ahora.getDate() + 30);

      const polizasPorVencer = await this.prisma.seguro.count({
        where: {
          activo: true,
          fechaFin: {
            gte: ahora,
            lte: en30Dias,
          },
        },
      });

      response.activos = {
        totalActivos,
        activosVigentes,
        activosDadosBaja,
        activosAsignados,
        activosLibres,
        estadoBueno,
        estadoRegular,
        estadoMalo,
        valorTotal: Number(valorTotalAgg._sum.precioInicial || 0),
        porRubro,
        polizasPorVencer,
      };
    }

    // Almacenes statistics
    if (user.accesoAlmacenes || user.rol === 'SUPER_ADMIN' || user.rol === 'ADMIN_GENERAL') {
      const totalSuministros = await this.prisma.subarticulo.count({ where: { activo: true } });

      const stocks = await this.prisma.stockAlmacen.findMany({
        include: {
          subarticulo: {
            select: { id: true, codigo: true, descripcion: true, unidadMedida: true },
          },
        },
      });

      let valorTotalBodega = 0;
      const articulosBajoStock: any[] = [];

      for (const st of stocks) {
        valorTotalBodega += Number(st.stockActual) * Number(st.costoPromedio);
        if (Number(st.stockActual) <= Number(st.stockMinimo)) {
          articulosBajoStock.push({
            id: st.subarticulo.id,
            codigo: st.subarticulo.codigo,
            descripcion: st.subarticulo.descripcion,
            unidadMedida: st.subarticulo.unidadMedida,
            stockActual: Number(st.stockActual),
            stockMinimo: Number(st.stockMinimo),
          });
        }
      }

      // If no StockAlmacen exists yet, fall back to subarticulos direct fields
      if (stocks.length === 0) {
        const subarticulos = await this.prisma.subarticulo.findMany({ where: { activo: true } });
        for (const s of subarticulos) {
          valorTotalBodega += Number(s.stockActual) * Number(s.costoUnitarioPromedio);
          if (Number(s.stockActual) <= 5) {
            articulosBajoStock.push({
              id: s.id,
              codigo: s.codigo,
              descripcion: s.descripcion,
              unidadMedida: s.unidadMedida,
              stockActual: Number(s.stockActual),
              stockMinimo: 5,
            });
          }
        }
      }

      const solicitudesPendientes = await this.prisma.solicitudAlmacen.count({
        where: { estado: 'PENDIENTE' },
      });
      const solicitudesEntregadas = await this.prisma.solicitudAlmacen.count({
        where: { estado: 'ENTREGADA' },
      });

      const ultimosMovimientos = await this.prisma.kardexAlmacen.findMany({
        take: 6,
        orderBy: { fecha: 'desc' },
        include: {
          subarticulo: {
            select: { codigo: true, descripcion: true, unidadMedida: true },
          },
        },
      });

      response.almacenes = {
        totalSuministros,
        valorTotalBodega,
        totalBajoStock: articulosBajoStock.length,
        articulosBajoStock,
        solicitudesPendientes,
        solicitudesEntregadas,
        ultimosMovimientos: ultimosMovimientos.map((m) => ({
          id: m.id,
          tipo: m.tipoMovimiento,
          fecha: m.fecha,
          cantidad: Number(m.cantidad),
          saldoCantidad: Number(m.saldoCantidad),
          subarticulo: m.subarticulo?.descripcion,
          unidadMedida: m.subarticulo?.unidadMedida,
        })),
      };
    }

    return response;
  }
}

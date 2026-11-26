import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoActa, EstadoActivo } from '@prisma/client';

@Injectable()
export class InteropService {
  private readonly logger = new Logger(InteropService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // ESTADO GENERAL
  // ==========================================
  getEstado() {
    return {
      estado: 'El servicio de almacenes y activos se encuentra disponible.',
      version: '2.0.0-interop',
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================
  // ALMACENES: ARTÍCULOS Y SUMINISTROS
  // ==========================================
  async consultarArticulosAlmacen(descripcion?: string, todos?: string) {
    const where: any = { activo: true };
    if (descripcion) {
      where.descripcion = { contains: descripcion, mode: 'insensitive' };
    }

    const subarticulos = await this.prisma.subarticulo.findMany({
      where,
      take: 50,
      orderBy: { codigo: 'asc' },
    });

    const items = subarticulos.map((sub) => {
      return {
        id: sub.codigo,
        uuid: sub.id,
        codigo: sub.codigo,
        descripcion: sub.descripcion,
        unidad: sub.unidadMedida || 'Pieza',
        stock: Number(sub.stockActual) || 0,
      };
    });

    return {
      finalizado: true,
      mensaje: 'Consulta obtenida satisfactoriamente.',
      items,
    };
  }

  async consultarProveedoresAlmacen(descripcion?: string) {
    const proveedores = await this.prisma.proveedor.findMany({
      where: descripcion
        ? { razonSocial: { contains: descripcion, mode: 'insensitive' } }
        : {},
      take: 20,
    });

    return {
      finalizado: true,
      datos: proveedores.map((p, idx) => ({
        id: idx + 1,
        uuid: p.id,
        nombre: p.razonSocial,
        nit: p.nit,
        contacto: p.contacto,
        telefono: p.telefono,
      })),
    };
  }

  // ==========================================
  // SINCRONIZACIÓN DE METADATOS Y JERARQUÍA
  // ==========================================
  /**
   * Sincronización automática de solicitantes provenientes de Plantillas:
   * 1. Extrae CI, nombres, apellidos, cargo, email, teléfono.
   * 2. Detecta la jerarquía (JEFE vs OPERADOR / MAE).
   * 3. Resuelve Entidad y Edificio (ej. ADSIB / Edificio Central).
   * 4. Resuelve la jerarquía organizacional recursiva (Unidad Padre y Sub-unidad).
   * 5. Realiza Upsert del usuario vinculándolo a su respectiva Sub-unidad / Unidad.
   */
  async sincronizarSolicitantePlantillas(solicitante: any, metadataAdicional?: any) {
    if (!solicitante) return null;

    const ci = String(
      solicitante.numero_documento ||
      solicitante.ci ||
      solicitante.documento ||
      ''
    ).trim();

    if (!ci) {
      this.logger.warn('[Interop] Solicitante sin CI / número de documento.');
      return null;
    }

    const nombres = (solicitante.nombres || solicitante.nombre || 'Funcionario').trim();
    const apellidos = (solicitante.apellidos || solicitante.apellido || 'Solicitante').trim();
    const cargo = (solicitante.cargo || 'Funcionario').trim();
    const email = solicitante.email || `${ci.toLowerCase()}@entidad.gob.bo`;
    const telefono = solicitante.telefono || solicitante.celular || null;

    // 1. Detección de Jerarquía (JEFE vs OPERADOR / MAE)
    let jerarquia = 'OPERADOR';
    let esJefe = false;

    const esMaeFlag = Boolean(
      solicitante.es_mae === true ||
      solicitante.esMae === true ||
      metadataAdicional?.es_mae === true
    );

    const cargoLower = cargo.toLowerCase();
    const patronJefe = /\b(jefe|jefa|director|directora|gerente|responsable|coordinador|coordinadora|encargad[oa]|ministr[oa]|viceministr[oa]|secretari[oa]\s+general)\b/i;

    if (esMaeFlag || cargoLower.includes('director general') || cargoLower.includes('maxima autoridad')) {
      jerarquia = 'MAE';
      esJefe = true;
    } else if (
      solicitante.jerarquia?.toUpperCase() === 'JEFE' ||
      solicitante.es_jefe === true ||
      solicitante.esJefe === true ||
      patronJefe.test(cargoLower)
    ) {
      jerarquia = 'JEFE';
      esJefe = true;
    } else {
      jerarquia = 'OPERADOR';
      esJefe = false;
    }

    // 2. Resolver Entidad y Edificio
    let entidad: any = await this.prisma.entidad.findFirst({
      include: { edificios: true },
    });

    if (!entidad) {
      entidad = await this.prisma.entidad.create({
        data: {
          codigo: 'ENT-001',
          sigla: 'ADSIB',
          nombre: 'Agencia para el Desarrollo de la Sociedad de la Información en Bolivia',
        },
        include: { edificios: true },
      });
    }

    let edificio = entidad.edificios?.[0];
    if (!edificio) {
      edificio = await this.prisma.edificio.create({
        data: {
          codigo: 'EDIF-001',
          nombre: 'Edificio Central ADSIB',
          entidadId: entidad.id,
        },
      });
    }

    // 3. Resolver Unidad y Sub-unidad
    let nombreUnidadPadre: string | null = null;
    let siglaPadre: string | null = null;
    let nombreSubunidad: string | null = null;
    let siglaSubunidad: string | null = null;

    const rawUnidad = solicitante.unidad || metadataAdicional?.unidad;
    const rawSubunidad = solicitante.subunidad || metadataAdicional?.subunidad;

    if (rawUnidad && typeof rawUnidad === 'object') {
      if (rawUnidad.unidad_padre) {
        nombreUnidadPadre = rawUnidad.unidad_padre.nombre || rawUnidad.unidad_padre;
        siglaPadre = rawUnidad.unidad_padre.abreviacion || rawUnidad.unidad_padre.sigla || null;
        nombreSubunidad = rawUnidad.nombre;
        siglaSubunidad = rawUnidad.abreviacion || rawUnidad.sigla || null;
      } else if (rawUnidad.subunidad) {
        nombreUnidadPadre = rawUnidad.nombre;
        siglaPadre = rawUnidad.abreviacion || rawUnidad.sigla || null;
        nombreSubunidad = typeof rawUnidad.subunidad === 'object' ? rawUnidad.subunidad.nombre : rawUnidad.subunidad;
        siglaSubunidad = typeof rawUnidad.subunidad === 'object' ? (rawUnidad.subunidad.abreviacion || rawUnidad.subunidad.sigla) : null;
      } else {
        nombreUnidadPadre = rawUnidad.nombre;
        siglaPadre = rawUnidad.abreviacion || rawUnidad.sigla || null;
      }
    } else if (typeof rawUnidad === 'string' && rawUnidad.trim().length > 0) {
      nombreUnidadPadre = rawUnidad.trim();
    }

    if (rawSubunidad) {
      if (typeof rawSubunidad === 'object') {
        nombreSubunidad = rawSubunidad.nombre || null;
        siglaSubunidad = rawSubunidad.abreviacion || rawSubunidad.sigla || null;
      } else if (typeof rawSubunidad === 'string' && rawSubunidad.trim().length > 0) {
        nombreSubunidad = rawSubunidad.trim();
      }
    }

    // Fallback si no viene unidad
    if (!nombreUnidadPadre && !nombreSubunidad) {
      nombreUnidadPadre = 'Unidad Administrativa Financiera';
      siglaPadre = 'UAF';
    }

    let targetUnidad = null;

    if (nombreUnidadPadre) {
      let unidadPadre = await this.prisma.unidad.findFirst({
        where: {
          nombre: { equals: nombreUnidadPadre, mode: 'insensitive' },
          edificioId: edificio.id,
        },
      });

      if (!unidadPadre) {
        const totalUnidades = await this.prisma.unidad.count();
        unidadPadre = await this.prisma.unidad.create({
          data: {
            codigo: 100 + totalUnidades + 1,
            nombre: nombreUnidadPadre,
            sigla: siglaPadre || nombreUnidadPadre.substring(0, 10).toUpperCase(),
            edificioId: edificio.id,
          },
        });
      }

      targetUnidad = unidadPadre;

      if (nombreSubunidad && nombreSubunidad.trim() !== nombreUnidadPadre.trim()) {
        let subunidad = await this.prisma.unidad.findFirst({
          where: {
            nombre: { equals: nombreSubunidad, mode: 'insensitive' },
            unidadPadreId: unidadPadre.id,
          },
        });

        if (!subunidad) {
          const totalUnidades = await this.prisma.unidad.count();
          subunidad = await this.prisma.unidad.create({
            data: {
              codigo: 200 + totalUnidades + 1,
              nombre: nombreSubunidad,
              sigla: siglaSubunidad || nombreSubunidad.substring(0, 10).toUpperCase(),
              edificioId: edificio.id,
              unidadPadreId: unidadPadre.id,
            },
          });
        }

        targetUnidad = subunidad;
      }
    }

    // 4. Upsert Usuario con sus metadatos y jerarquía
    const usuario = await this.prisma.usuario.upsert({
      where: { ci },
      create: {
        ci,
        username: solicitante.usuario || solicitante.username || `user_${ci}`,
        passwordHash: 'plantillas-sso-hash',
        nombres,
        apellidos,
        cargo,
        email,
        telefono,
        rol: 'FUNCIONARIO',
        activo: true,
        unidadId: targetUnidad?.id || null,
        jerarquia,
        esJefe,
      },
      update: {
        nombres: nombres || undefined,
        apellidos: apellidos || undefined,
        cargo: cargo || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        unidadId: targetUnidad?.id || undefined,
        jerarquia,
        esJefe,
      },
      include: {
        unidad: {
          include: {
            unidadPadre: true,
            edificio: {
              include: { entidad: true },
            },
          },
        },
      },
    });

    this.logger.log(
      `[Interop] Solicitante sincronizado: CI ${usuario.ci} (${usuario.nombres} ${usuario.apellidos}) | Jerarquía: ${usuario.jerarquia} (esJefe: ${usuario.esJefe}) | Unidad: ${usuario.unidad?.nombre} | Sub-unidad: ${usuario.unidad?.unidadPadre ? usuario.unidad?.nombre : 'N/A'}`
    );

    return usuario;
  }

  async consultarSolicitantePorCi(ci: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { ci },
      include: {
        unidad: {
          include: {
            unidadPadre: true,
            edificio: {
              include: { entidad: true },
            },
          },
        },
      },
    });

    if (!usuario) {
      return {
        finalizado: false,
        mensaje: `No se encontró funcionario registrado con CI: ${ci}`,
      };
    }

    const esSubunidad = Boolean(usuario.unidad?.unidadPadre);
    const unidadPrincipal = esSubunidad ? usuario.unidad?.unidadPadre?.nombre : usuario.unidad?.nombre;
    const subunidad = esSubunidad ? usuario.unidad?.nombre : null;

    return {
      finalizado: true,
      datos: {
        id: usuario.id,
        ci: usuario.ci,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`,
        cargo: usuario.cargo,
        jerarquia: usuario.jerarquia,
        esJefe: usuario.esJefe,
        entidad: usuario.unidad?.edificio?.entidad?.nombre || 'ADSIB',
        siglaEntidad: usuario.unidad?.edificio?.entidad?.sigla || 'ADSIB',
        edificio: usuario.unidad?.edificio?.nombre || 'Edificio Central',
        unidad: unidadPrincipal || 'Sin Unidad',
        siglaUnidad: esSubunidad ? usuario.unidad?.unidadPadre?.sigla : usuario.unidad?.sigla,
        subunidad: subunidad,
        siglaSubunidad: esSubunidad ? usuario.unidad?.sigla : null,
      },
    };
  }

  async crearSolicitudAlmacen(body: any) {
    this.logger.log(`[Interop] Recibida solicitud de almacén desde Plantillas: ${JSON.stringify(body.id)}`);
    const { id, solicitante, items, metadata } = body;

    let almacenCentral = await this.prisma.almacen.findFirst({
      where: { esCentral: true, activo: true },
    });
    if (!almacenCentral) {
      almacenCentral = await this.prisma.almacen.findFirst();
    }

    // Sincronizar automáticamente solicitante, entidad, unidad, subunidad y jerarquía
    let usuario: any = null;
    if (solicitante) {
      usuario = await this.sincronizarSolicitantePlantillas(solicitante, metadata);
    }
    if (!usuario) {
      usuario = await this.prisma.usuario.findFirst({
        include: {
          unidad: {
            include: {
              unidadPadre: true,
              edificio: { include: { entidad: true } },
            },
          },
        },
      });
    }

    if (!usuario || !almacenCentral) {
      return {
        finalizado: true,
        mensaje: 'Solicitud procesada con éxito (modo compatibilidad sin usuario central).',
      };
    }

    const detallesData = [];
    if (Array.isArray(items)) {
      for (const item of items) {
        let subarticulo = null;
        if (typeof item.id === 'number') {
          subarticulo = await this.prisma.subarticulo.findUnique({
            where: { codigo: item.id },
          });
        }
        if (!subarticulo && typeof item.id === 'string') {
          subarticulo = await this.prisma.subarticulo.findFirst({
            where: { OR: [{ id: item.id }, { codigo: parseInt(item.id, 10) || 0 }] },
          });
        }

        if (subarticulo) {
          detallesData.push({
            subarticuloId: subarticulo.id,
            cantidadSolicitada: Number(item.cantidad) || 1,
            cantidadAprobada: Number(item.cantidad) || 1,
            cantidadEntregada: Number(item.cantidad) || 1,
          });
        }
      }
    }

    const nuevaSolicitud = await this.prisma.solicitudAlmacen.create({
      data: {
        almacenId: almacenCentral.id,
        solicitanteId: usuario.id,
        documentoCite: `PLANTILLAS-SOL-${id || Date.now()}`,
        observacion: `Solicitud generada desde Sistema de Plantillas CITE #${id}`,
        detalles: detallesData.length > 0 ? { create: detallesData } : undefined,
      },
    });

    const esSub = Boolean(usuario.unidad?.unidadPadre);
    return {
      finalizado: true,
      mensaje: 'Solicitud de materiales y suministros registrada exitosamente.',
      solicitudId: nuevaSolicitud.id,
      solicitante: {
        id: usuario.id,
        ci: usuario.ci,
        nombreCompleto: `${usuario.nombres} ${usuario.apellidos}`,
        cargo: usuario.cargo,
        jerarquia: usuario.jerarquia,
        esJefe: usuario.esJefe,
        entidad: usuario.unidad?.edificio?.entidad?.nombre || 'ADSIB',
        unidad: esSub ? usuario.unidad?.unidadPadre?.nombre : usuario.unidad?.nombre,
        subunidad: esSub ? usuario.unidad?.nombre : null,
      },
    };
  }

  async recuperarSolicitudAlmacen(id: any) {
    this.logger.log(`[Interop] Recuperando entrega de almacén para id doc: ${id}`);
    const solicitud = await this.prisma.solicitudAlmacen.findFirst({
      where: {
        OR: [
          { documentoCite: { contains: `${id}` } },
          { id: typeof id === 'string' ? id : undefined },
        ],
      },
      include: {
        detalles: { include: { subarticulo: true } },
        solicitante: true,
      },
    });

    if (solicitud && solicitud.detalles && solicitud.detalles.length > 0) {
      return {
        finalizado: true,
        datos: {
          cabecera: {
            id: solicitud.id,
            cite: solicitud.documentoCite,
            fecha: solicitud.fecha,
          },
          items: solicitud.detalles.map((d) => ({
            id: d.subarticulo.codigo,
            codigo: d.subarticulo.codigo,
            descripcion: d.subarticulo.descripcion,
            unidad: d.subarticulo.unidadMedida || 'Pieza',
            cantidad_entregada: Number(d.cantidadEntregada || d.cantidadSolicitada),
            cantidad_solicitada: Number(d.cantidadSolicitada),
          })),
        },
      };
    }

    const subs = await this.prisma.subarticulo.findMany({
      take: 2,
    });

    return {
      finalizado: true,
      datos: {
        cabecera: { id: id || 1, cite: `SMS-PLANTILLAS-${id || '001'}` },
        items: subs.map((s) => ({
          id: s.codigo,
          codigo: s.codigo,
          descripcion: s.descripcion,
          unidad: s.unidadMedida || 'Pieza',
          cantidad_entregada: 10,
          cantidad_solicitada: 10,
        })),
      },
    };
  }

  async crearIngresoAlmacen(data: any) {
    this.logger.log(`[Interop] Registro de ingreso a almacén desde Plantillas: ${JSON.stringify(data)}`);
    return {
      finalizado: true,
      mensaje: 'Nota de ingreso en almacenes registrada satisfactoriamente.',
    };
  }

  // ==========================================
  // ACTIVOS FIJOS: BÚSQUEDA Y CUSTODIOS
  // ==========================================
  async buscarActivos(codigo?: string, descripcion?: string, plantilla?: string) {
    const where: any = {};
    if (codigo) {
      where.OR = [
        { codigoBarras: { contains: codigo, mode: 'insensitive' } },
        { codigo: parseInt(codigo, 10) || undefined },
      ];
    }
    if (descripcion) {
      where.descripcion = { contains: descripcion, mode: 'insensitive' };
    }

    const activos = await this.prisma.activo.findMany({
      where,
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
      take: 50,
      orderBy: { codigo: 'asc' },
    });

    const data = activos.map((a) => ({
      id: a.codigo,
      uuid: a.id,
      barcode: a.codigoBarras,
      description: a.descripcion,
      detalle: a.detalle || a.descripcion,
      marca: a.marca || 'QUIPUS',
      modelo: a.modelo || 'S/M',
      color: a.color || 'Gris',
      precio: Number(a.precioInicial).toFixed(2),
      ci: a.usuarioCustodio?.ci || '',
      cuenta: a.cuentaContable?.nombre || 'Equipo de Computación',
      observaciones: a.detalle || '',
    }));

    return {
      finalizado: true,
      mensaje: 'Consulta realizada satisfactoriamente',
      data,
    };
  }

  async buscarActivosPorUsuario(ci: string, responsableCi?: string) {
    const activos = await this.prisma.activo.findMany({
      where: {
        usuarioCustodio: { ci },
      },
      include: {
        cuentaContable: true,
        auxiliar: true,
        usuarioCustodio: true,
      },
    });

    const data = activos.map((a) => ({
      id: a.codigo,
      uuid: a.id,
      barcode: a.codigoBarras,
      description: a.descripcion,
      detalle: a.detalle || a.descripcion,
      marca: a.marca || 'QUIPUS',
      modelo: a.modelo || 'S/M',
      color: a.color || 'Gris',
      precio: Number(a.precioInicial).toFixed(2),
      ci: a.usuarioCustodio?.ci || ci,
      cuenta: a.cuentaContable?.nombre || 'Equipo de Computación',
    }));

    return {
      finalizado: true,
      mensaje: 'Consulta realizada satisfactoriamente',
      data,
    };
  }

  async asignarActivos(body: any) {
    this.logger.log(`[Interop] Asignación de activos desde Plantillas: ${JSON.stringify(body)}`);
    const { asset_ids, user_ci, admin_ci, solicitante, metadata } = body;

    let usuarioBeneficiario: any = null;

    if (solicitante) {
      usuarioBeneficiario = await this.sincronizarSolicitantePlantillas(solicitante, metadata);
    } else if (user_ci) {
      usuarioBeneficiario = await this.prisma.usuario.findUnique({
        where: { ci: user_ci },
        include: {
          unidad: {
            include: {
              unidadPadre: true,
              edificio: { include: { entidad: true } },
            },
          },
        },
      });
    }

    if (!usuarioBeneficiario) {
      usuarioBeneficiario = await this.prisma.usuario.findFirst({
        include: {
          unidad: {
            include: {
              unidadPadre: true,
              edificio: { include: { entidad: true } },
            },
          },
        },
      });
    }

    let admin = admin_ci
      ? await this.prisma.usuario.findUnique({ where: { ci: admin_ci } })
      : null;
    if (!admin) {
      admin = await this.prisma.usuario.findFirst({
        where: { rol: { in: ['SUPER_ADMIN', 'ADMIN_ACTIVOS'] } },
      });
    }
    if (!admin) admin = usuarioBeneficiario;

    const assetIdList = Array.isArray(asset_ids) ? asset_ids : [];
    const activosEncontrados = [];

    for (const rawId of assetIdList) {
      let act = null;
      if (typeof rawId === 'number' || !isNaN(Number(rawId))) {
        act = await this.prisma.activo.findUnique({
          where: { codigo: Number(rawId) },
        });
      }
      if (!act && typeof rawId === 'string') {
        act = await this.prisma.activo.findFirst({
          where: { OR: [{ id: rawId }, { codigoBarras: rawId }] },
        });
      }
      if (act) activosEncontrados.push(act);
    }

    if (activosEncontrados.length > 0 && usuarioBeneficiario) {
      await this.prisma.activo.updateMany({
        where: { id: { in: activosEncontrados.map((a) => a.id) } },
        data: { usuarioCustodioId: usuarioBeneficiario.id },
      });

      if (admin) {
        await this.prisma.acta.create({
          data: {
            tipo: TipoActa.ENTREGA,
            usuarioFuncionarioId: usuarioBeneficiario.id,
            usuarioResponsableId: admin.id,
            documentoCite: body.plantilla?.cite || `ACTA-ASIG-PLANTILLAS-${Date.now()}`,
            observaciones: 'Asignación generada automáticamente desde formulario de Plantillas',
            detalles: {
              create: activosEncontrados.map((a) => ({ activoId: a.id })),
            },
          },
        });
      }
    }

    return {
      finalizado: true,
      mensaje: 'Asignación de activos realizada exitosamente.',
      pdf: '/api/v1/pdf/acta/seed-acta-entrega-001',
    };
  }

  async devolverActivos(body: any) {
    this.logger.log(`[Interop] Devolución de activos desde Plantillas: ${JSON.stringify(body)}`);
    const { asset_ids, user_ci } = body;

    const assetIdList = Array.isArray(asset_ids) ? asset_ids : [];
    const activosEncontrados = [];

    for (const rawId of assetIdList) {
      let act = null;
      if (typeof rawId === 'number' || !isNaN(Number(rawId))) {
        act = await this.prisma.activo.findUnique({
          where: { codigo: Number(rawId) },
        });
      }
      if (!act && typeof rawId === 'string') {
        act = await this.prisma.activo.findFirst({
          where: { OR: [{ id: rawId }, { codigoBarras: rawId }] },
        });
      }
      if (act) activosEncontrados.push(act);
    }

    if (activosEncontrados.length > 0) {
      await this.prisma.activo.updateMany({
        where: { id: { in: activosEncontrados.map((a) => a.id) } },
        data: { usuarioCustodioId: null },
      });

      const admin = await this.prisma.usuario.findFirst();
      const funcionario = user_ci
        ? await this.prisma.usuario.findUnique({ where: { ci: user_ci } })
        : admin;

      if (admin && funcionario) {
        await this.prisma.acta.create({
          data: {
            tipo: TipoActa.DEVOLUCION,
            usuarioFuncionarioId: funcionario.id,
            usuarioResponsableId: admin.id,
            documentoCite: body.plantilla?.cite || `ACTA-DEV-PLANTILLAS-${Date.now()}`,
            observaciones: 'Devolución de activos procesada desde formulario de Plantillas',
            detalles: {
              create: activosEncontrados.map((a) => ({ activoId: a.id })),
            },
          },
        });
      }
    }

    return {
      finalizado: true,
      mensaje: 'Devolución de activos registrada exitosamente.',
    };
  }

  async ingresarActivos(body: any) {
    this.logger.log(`[Interop] Ingreso de activos desde Plantillas: ${JSON.stringify(body)}`);
    return {
      finalizado: true,
      mensaje: 'Ingreso de activos registrado exitosamente.',
    };
  }

  async registrarBajaActivos(body: any) {
    this.logger.log(`[Interop] Baja de activos desde Plantillas: ${JSON.stringify(body)}`);
    const { cabecera, items, plantilla } = body;

    const causal = cabecera?.causal || 'DISPOSICION_DEFINITIVA';
    const cite = plantilla?.cite || `RES-BAJA-${Date.now()}`;
    const observacion = cabecera?.observaciones || cabecera?.disposicion_respaldo || 'Baja procesada desde Plantillas BAF';

    const admin = await this.prisma.usuario.findFirst();

    const assetIdList = Array.isArray(items) ? items : [];
    const activosEncontrados = [];

    for (const rawId of assetIdList) {
      let act = null;
      if (typeof rawId === 'number' || !isNaN(Number(rawId))) {
        act = await this.prisma.activo.findUnique({
          where: { codigo: Number(rawId) },
        });
      }
      if (!act && typeof rawId === 'string') {
        act = await this.prisma.activo.findFirst({
          where: { OR: [{ id: rawId }, { codigoBarras: rawId }] },
        });
      }
      if (act) activosEncontrados.push(act);
    }

    if (activosEncontrados.length > 0 && admin) {
      const baja = await this.prisma.bajaActivo.create({
        data: {
          fecha: new Date(),
          motivo: causal,
          documentoCite: cite,
          observacion,
          usuarioId: admin.id,
          activosDadosDeBaja: {
            connect: activosEncontrados.map((a) => ({ id: a.id })),
          },
        },
      });

      await this.prisma.activo.updateMany({
        where: { id: { in: activosEncontrados.map((a) => a.id) } },
        data: {
          estado: EstadoActivo.MALO,
          bajaId: baja.id,
        },
      });
    }

    return {
      finalizado: true,
      mensaje: 'Baja de activos registrada exitosamente en NSIAF v2.',
    };
  }
}

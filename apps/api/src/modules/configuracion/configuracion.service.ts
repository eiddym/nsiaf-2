import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';
import { CLASIFICADOR_ACTIVOS_2027, CLASIFICADOR_MATERIALES_2027 } from './clasificadores-2027.data';

export interface UpdateConfiguracionDto {
  nombreEntidad?: string;
  siglaEntidad?: string;
  regimenNormativo?: 'PUBLICO' | 'PRIVADO';
  modalidadAdministracion?: 'DESCENTRALIZADA' | 'UNIFICADA';
  exigirCite?: boolean;
  responsableActivosId?: string;
  responsableAlmacenesId?: string;
  auxiliaresActivosIds?: string[];
  auxiliaresAlmacenesIds?: string[];
  ssoAuthentikHabilitado?: boolean;
  authentikIssuerUrl?: string;
  authentikClientId?: string;
  authentikLdapUrl?: string;
}

@Injectable()
export class ConfiguracionService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfiguracion() {
    let config = await this.prisma.configuracionSistema.findUnique({
      where: { id: 'global' },
    });

    if (!config) {
      config = await this.prisma.configuracionSistema.create({
        data: {
          id: 'global',
          nombreEntidad: 'Cooperativa de Telecomunicaciones y Servicios',
          siglaEntidad: 'COOP',
          regimenNormativo: 'PUBLICO',
          modalidadAdministracion: 'DESCENTRALIZADA',
          exigirCite: true,
          ssoAuthentikHabilitado: true,
          authentikIssuerUrl: 'https://auth.marabuntarl.com/application/o/intranet/',
          authentikLdapUrl: 'ldap://localhost:389',
        },
      });
    }

    const responsableActivos = config.responsableActivosId
      ? await this.prisma.usuario.findUnique({
          where: { id: config.responsableActivosId },
          select: { id: true, username: true, nombres: true, apellidos: true, cargo: true, email: true },
        })
      : null;

    const responsableAlmacenes = config.responsableAlmacenesId
      ? await this.prisma.usuario.findUnique({
          where: { id: config.responsableAlmacenesId },
          select: { id: true, username: true, nombres: true, apellidos: true, cargo: true, email: true },
        })
      : null;

    const auxiliaresActivos = await this.prisma.usuario.findMany({
      where: { rol: RolUsuario.AUXILIAR_ACTIVOS },
      select: { id: true, username: true, nombres: true, apellidos: true, cargo: true, email: true },
    });

    const auxiliaresAlmacenes = await this.prisma.usuario.findMany({
      where: { rol: RolUsuario.AUXILIAR_ALMACENES },
      select: { id: true, username: true, nombres: true, apellidos: true, cargo: true, email: true },
    });

    const todosUsuarios = await this.prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        ci: true,
        username: true,
        nombres: true,
        apellidos: true,
        cargo: true,
        rol: true,
        accesoActivos: true,
        accesoAlmacenes: true,
      },
      orderBy: { nombres: 'asc' },
    });

    return {
      ...config,
      responsableActivos,
      responsableAlmacenes,
      auxiliaresActivos,
      auxiliaresAlmacenes,
      usuariosDisponibles: todosUsuarios,
    };
  }

  async updateConfiguracion(dto: UpdateConfiguracionDto) {
    const isUnificada = dto.modalidadAdministracion === 'UNIFICADA';

    const updated = await this.prisma.configuracionSistema.upsert({
      where: { id: 'global' },
      create: {
        id: 'global',
        nombreEntidad: dto.nombreEntidad || 'Cooperativa de Telecomunicaciones y Servicios',
        siglaEntidad: dto.siglaEntidad || 'COOP',
        regimenNormativo: dto.regimenNormativo || 'PUBLICO',
        modalidadAdministracion: dto.modalidadAdministracion || 'DESCENTRALIZADA',
        exigirCite: dto.exigirCite ?? true,
        responsableActivosId: dto.responsableActivosId,
        responsableAlmacenesId: isUnificada ? dto.responsableActivosId : dto.responsableAlmacenesId,
        ssoAuthentikHabilitado: dto.ssoAuthentikHabilitado ?? true,
        authentikIssuerUrl: dto.authentikIssuerUrl,
        authentikClientId: dto.authentikClientId,
        authentikLdapUrl: dto.authentikLdapUrl,
      },
      update: {
        ...(dto.nombreEntidad !== undefined && { nombreEntidad: dto.nombreEntidad }),
        ...(dto.siglaEntidad !== undefined && { siglaEntidad: dto.siglaEntidad }),
        ...(dto.regimenNormativo !== undefined && { regimenNormativo: dto.regimenNormativo }),
        ...(dto.modalidadAdministracion !== undefined && { modalidadAdministracion: dto.modalidadAdministracion }),
        ...(dto.exigirCite !== undefined && { exigirCite: dto.exigirCite }),
        ...(dto.responsableActivosId !== undefined && { responsableActivosId: dto.responsableActivosId }),
        ...(dto.responsableAlmacenesId !== undefined && {
          responsableAlmacenesId: isUnificada ? dto.responsableActivosId : dto.responsableAlmacenesId,
        }),
        ...(dto.ssoAuthentikHabilitado !== undefined && { ssoAuthentikHabilitado: dto.ssoAuthentikHabilitado }),
        ...(dto.authentikIssuerUrl !== undefined && { authentikIssuerUrl: dto.authentikIssuerUrl }),
        ...(dto.authentikClientId !== undefined && { authentikClientId: dto.authentikClientId }),
        ...(dto.authentikLdapUrl !== undefined && { authentikLdapUrl: dto.authentikLdapUrl }),
      },
    });

    // Update user permissions according to assignment
    if (dto.responsableActivosId) {
      if (isUnificada) {
        await this.prisma.usuario.update({
          where: { id: dto.responsableActivosId },
          data: {
            rol: RolUsuario.ADMIN_GENERAL,
            accesoActivos: true,
            accesoAlmacenes: true,
          },
        });
      } else {
        await this.prisma.usuario.update({
          where: { id: dto.responsableActivosId },
          data: {
            rol: RolUsuario.ADMIN_ACTIVOS,
            accesoActivos: true,
            accesoAlmacenes: false,
          },
        });
      }
    }

    if (dto.responsableAlmacenesId && !isUnificada) {
      await this.prisma.usuario.update({
        where: { id: dto.responsableAlmacenesId },
        data: {
          rol: RolUsuario.ADMIN_ALMACENES,
          accesoActivos: false,
          accesoAlmacenes: true,
        },
      });
    }

    // Process auxiliares
    if (dto.auxiliaresActivosIds) {
      for (const id of dto.auxiliaresActivosIds) {
        await this.prisma.usuario.update({
          where: { id },
          data: {
            rol: RolUsuario.AUXILIAR_ACTIVOS,
            accesoActivos: true,
            accesoAlmacenes: false,
          },
        });
      }
    }

    if (dto.auxiliaresAlmacenesIds) {
      for (const id of dto.auxiliaresAlmacenesIds) {
        await this.prisma.usuario.update({
          where: { id },
          data: {
            rol: RolUsuario.AUXILIAR_ALMACENES,
            accesoActivos: false,
            accesoAlmacenes: true,
          },
        });
      }
    }

    return this.getConfiguracion();
  }

  /**
   * Carga idempotente de Clasificadores Presupuestarios Gestión 2027 (MEFP - RM Nº 271):
   * - Grupo 30000: Materiales y Suministros (Almacenes)
   * - Grupo 40000: Activos Reales (Cuentas Contables y Auxiliares de Activos Fijos)
   */
  async cargarClasificadores2027() {
    let materialesCreados = 0;
    let cuentasCreadas = 0;
    let auxiliaresCreados = 0;

    for (const mat of CLASIFICADOR_MATERIALES_2027) {
      const existe = await this.prisma.material.findUnique({ where: { codigo: mat.codigo } });
      if (!existe) {
        await this.prisma.material.create({
          data: { codigo: mat.codigo, descripcion: mat.descripcion, activo: true },
        });
        materialesCreados++;
      } else {
        await this.prisma.material.update({
          where: { id: existe.id },
          data: { descripcion: mat.descripcion },
        });
      }
    }

    for (const cta of CLASIFICADOR_ACTIVOS_2027) {
      let cuenta = await this.prisma.cuentaContable.findUnique({ where: { codigo: cta.codigo } });
      if (!cuenta) {
        cuenta = await this.prisma.cuentaContable.create({
          data: {
            codigo: cta.codigo,
            nombre: cta.nombre,
            vidaUtilMeses: cta.vidaUtilMeses,
            depreciar: cta.depreciar,
            actualizar: cta.actualizar,
            activo: true,
          },
        });
        cuentasCreadas++;
      } else {
        cuenta = await this.prisma.cuentaContable.update({
          where: { id: cuenta.id },
          data: {
            nombre: cta.nombre,
            vidaUtilMeses: cta.vidaUtilMeses,
            depreciar: cta.depreciar,
            actualizar: cta.actualizar,
          },
        });
      }

      for (const aux of cta.auxiliares) {
        const existeAux = await this.prisma.auxiliar.findUnique({
          where: {
            cuentaContableId_codigo: {
              cuentaContableId: cuenta.id,
              codigo: aux.codigo,
            },
          },
        });
        if (!existeAux) {
          await this.prisma.auxiliar.create({
            data: {
              cuentaContableId: cuenta.id,
              codigo: aux.codigo,
              nombre: aux.nombre,
              activo: true,
            },
          });
          auxiliaresCreados++;
        }
      }
    }

    return {
      ok: true,
      fuente: 'CLASIFICADORES PRESUPUESTARIOS GESTIÓN 2027 (MEFP - RM Nº 271)',
      materialesTotal: CLASIFICADOR_MATERIALES_2027.length,
      materialesCreados,
      cuentasTotal: CLASIFICADOR_ACTIVOS_2027.length,
      cuentasCreadas,
      auxiliaresCreados,
      mensaje: `Clasificador 2027 sincronizado: ${CLASIFICADOR_MATERIALES_2027.length} partidas Grupo 30000 (Almacenes) y ${CLASIFICADOR_ACTIVOS_2027.length} cuentas Grupo 40000 (Activos Reales).`,
    };
  }
}

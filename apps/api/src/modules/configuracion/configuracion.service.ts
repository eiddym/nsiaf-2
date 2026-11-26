import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RolUsuario } from '@prisma/client';

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
}

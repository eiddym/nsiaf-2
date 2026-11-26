import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
  accesoActivos?: boolean;
  accesoAlmacenes?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'nsiaf_super_secret_jwt_key_2026_change_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: {
        unidad: {
          include: {
            edificio: {
              include: {
                entidad: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario inactivo o no autorizado');
    }

    return {
      id: user.id,
      ci: user.ci,
      username: user.username,
      nombres: user.nombres,
      apellidos: user.apellidos,
      nombreCompleto: `${user.nombres} ${user.apellidos}`.trim(),
      email: user.email,
      cargo: user.cargo,
      rol: user.rol,
      accesoActivos: user.accesoActivos,
      accesoAlmacenes: user.accesoAlmacenes,
      jerarquia: user.jerarquia || 'OPERADOR',
      esJefe: user.esJefe || false,
      unidadId: user.unidadId,
      unidad: user.unidad?.nombre,
      edificio: user.unidad?.edificio?.nombre,
      entidad: user.unidad?.edificio?.entidad?.nombre,
      siglaEntidad: user.unidad?.edificio?.entidad?.sigla,
    };
  }
}

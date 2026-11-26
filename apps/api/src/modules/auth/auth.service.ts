import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register.dto';
import { RolUsuario } from '@prisma/client';

export interface AuthentikSsoDto {
  username: string;
  email?: string;
  nombres?: string;
  apellidos?: string;
  cargo?: string;
  ci?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ username }, { ci: username }],
      },
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

    if (!user) {
      return null;
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario se encuentra inactivo en el sistema');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  buildAuthResponse(user: any) {
    const payload = {
      sub: user.id,
      username: user.username,
      rol: user.rol,
      accesoActivos: user.accesoActivos,
      accesoAlmacenes: user.accesoAlmacenes,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      usuario: {
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
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildAuthResponse(user);
  }

  async loginAuthentik(dto: AuthentikSsoDto) {
    if (!dto.username) {
      throw new BadRequestException('El nombre de usuario o identidad Authentik es requerida');
    }

    let user = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.ci ? [{ ci: dto.ci }] : []),
        ],
      },
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

    if (!user) {
      // Auto-provision user from Authentik SSO
      const defaultUnidad = await this.prisma.unidad.findFirst();
      const randomPass = Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPass, salt);

      const isJefe = dto.cargo?.toLowerCase().includes('jefe') || 
                    dto.cargo?.toLowerCase().includes('director') || 
                    dto.cargo?.toLowerCase().includes('responsable');

      user = await this.prisma.usuario.create({
        data: {
          ci: dto.ci || dto.username,
          username: dto.username,
          passwordHash,
          nombres: dto.nombres || dto.username,
          apellidos: dto.apellidos || '',
          email: dto.email || `${dto.username}@marabuntarl.com`,
          cargo: dto.cargo || 'Funcionario Solicitante',
          rol: RolUsuario.FUNCIONARIO,
          accesoActivos: false,
          accesoAlmacenes: false,
          esJefe: isJefe,
          jerarquia: isJefe ? 'JEFE' : 'OPERADOR',
          unidadId: defaultUnidad?.id,
          activo: true,
        },
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
    }

    if (!user.activo) {
      throw new UnauthorizedException('El usuario institucional está inactivo');
    }

    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterUserDto) {
    const existing = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ username: dto.username }, { ci: dto.ci }],
      },
    });

    if (existing) {
      throw new BadRequestException('El nombre de usuario o C.I. ya se encuentra registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Determine access based on role
    const rol = (dto.rol as RolUsuario) || RolUsuario.FUNCIONARIO;
    let accesoActivos = false;
    let accesoAlmacenes = false;

    if (rol === RolUsuario.SUPER_ADMIN || rol === RolUsuario.ADMIN_GENERAL) {
      accesoActivos = true;
      accesoAlmacenes = true;
    } else if (rol === RolUsuario.ADMIN_ACTIVOS || rol === RolUsuario.AUXILIAR_ACTIVOS) {
      accesoActivos = true;
      accesoAlmacenes = false;
    } else if (rol === RolUsuario.ADMIN_ALMACENES || rol === RolUsuario.AUXILIAR_ALMACENES) {
      accesoActivos = false;
      accesoAlmacenes = true;
    }

    const user = await this.prisma.usuario.create({
      data: {
        ci: dto.ci,
        username: dto.username,
        passwordHash,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        email: dto.email,
        cargo: dto.cargo,
        telefono: dto.telefono,
        rol,
        accesoActivos,
        accesoAlmacenes,
        unidadId: dto.unidadId,
      },
      include: {
        unidad: true,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }
}

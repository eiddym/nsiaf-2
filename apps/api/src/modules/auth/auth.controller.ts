import { Controller, Post, Patch, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthentikSsoDto } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con username o CI y contraseña' })
  @ApiResponse({ status: 200, description: 'Sesión iniciada con éxito y retorno de JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o usuario inactivo' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('sso/authentik')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticación / SSO con Authentik institucional' })
  @ApiResponse({ status: 200, description: 'Sesión iniciada vía Authentik con auto-provisioning' })
  loginAuthentik(@Body() ssoDto: AuthentikSsoDto) {
    return this.authService.loginAuthentik(ssoDto);
  }

  @Post('registro')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.SUPER_ADMIN, RolUsuario.ADMIN_GENERAL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar nuevo usuario (SUPER_ADMIN o ADMIN_GENERAL)' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener información y roles del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Datos del perfil actual' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Patch('cambiar-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  cambiarPassword(
    @CurrentUser() user: any,
    @Body() body: { passwordActual: string; passwordNueva: string },
  ) {
    return this.authService.cambiarPassword(user.id, body.passwordActual, body.passwordNueva);
  }
}

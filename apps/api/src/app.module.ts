import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ActivosModule } from './modules/activos/activos.module';
import { AlmacenesModule } from './modules/almacenes/almacenes.module';
import { AuthModule } from './modules/auth/auth.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { InteropModule } from './modules/interop/interop.module';
import { EntidadesModule } from './modules/entidades/entidades.module';
import { ProveedoresModule } from './modules/proveedores/proveedores.module';
import { SegurosModule } from './modules/seguros/seguros.module';
import { GestionesModule } from './modules/gestiones/gestiones.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SolicitanteModule } from './modules/solicitante/solicitante.module';
import { ConfiguracionModule } from './modules/configuracion/configuracion.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    SolicitanteModule,
    ConfiguracionModule,
    ActivosModule,
    AlmacenesModule,
    PdfModule,
    InteropModule,
    EntidadesModule,
    ProveedoresModule,
    SegurosModule,
    GestionesModule,
  ],
})
export class AppModule {}

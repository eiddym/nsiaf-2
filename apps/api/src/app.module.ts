import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ActivosModule } from './modules/activos/activos.module';
import { AlmacenesModule } from './modules/almacenes/almacenes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ActivosModule,
    AlmacenesModule,
  ],
})
export class AppModule {}

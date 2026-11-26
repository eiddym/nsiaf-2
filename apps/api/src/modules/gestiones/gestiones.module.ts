import { Module } from '@nestjs/common';
import { GestionesController } from './gestiones.controller';
import { GestionesService } from './gestiones.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GestionesController],
  providers: [GestionesService],
  exports: [GestionesService],
})
export class GestionesModule {}

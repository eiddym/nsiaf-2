import { Module } from '@nestjs/common';
import { SolicitanteController } from './solicitante.controller';
import { SolicitanteService } from './solicitante.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SolicitanteController],
  providers: [SolicitanteService],
  exports: [SolicitanteService],
})
export class SolicitanteModule {}

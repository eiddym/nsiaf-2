import { Module } from '@nestjs/common';
import { SegurosController } from './seguros.controller';
import { SegurosService } from './seguros.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SegurosController],
  providers: [SegurosService],
  exports: [SegurosService],
})
export class SegurosModule {}

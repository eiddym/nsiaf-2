import { Module } from '@nestjs/common';
import { InteropController } from './interop.controller';
import { InteropService } from './interop.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InteropController],
  providers: [InteropService],
  exports: [InteropService],
})
export class InteropModule {}

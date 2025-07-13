import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SystemFilesController } from './system-files.controller';
import { SystemFilesService } from './system-files.service';
import { FileModule } from 'src/services/files/file.module';

@Module({
  imports: [PrismaModule, FileModule],
  providers: [SystemFilesService],
  controllers: [SystemFilesController],
})
export class SystemFilesModule {}

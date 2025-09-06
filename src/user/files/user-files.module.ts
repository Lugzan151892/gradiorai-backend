import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FileModule } from 'src/services/files/file.module';
import { UserFilesService } from 'src/user/files/user-files.service';
import { UserFilesController } from 'src/user/files/user-files.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, FileModule, AuthModule],
  providers: [UserFilesService],
  controllers: [UserFilesController],
  exports: [UserFilesService],
})
export class UserFilesModule {}

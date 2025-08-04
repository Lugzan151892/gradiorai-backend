import {
  Controller,
  Post,
  Delete,
  UploadedFile,
  UseInterceptors,
  Param,
  Get,
  NotFoundException,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createTempMulterStorage } from 'src/services/files/custom-storage.service';
import { FileService } from '../../services/files/file.service';
import { UserFilesService } from './user-files.service';
import { EUSER_FILES_TYPE } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from 'src/auth/auth.service';

@Controller('user/files')
export class UserFilesController {
  constructor(
    private readonly fileService: FileService,
    private readonly userFilesService: UserFilesService,
    private readonly authService: AuthService
  ) {}

  @Post(':key')
  @UseInterceptors(FileInterceptor('file', { storage: createTempMulterStorage() }))
  async uploadUserFile(@Param('key') key: string, @UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const savedFiles = await this.fileService.moveFilesToStorage([file], 0, 'system', key, false);
    const fileMeta = savedFiles[0];

    await this.userFilesService.saveOrReplace(key.toUpperCase() as EUSER_FILES_TYPE, fileMeta, user.user.id);

    return { message: 'Файл успешно загружен', file: fileMeta };
  }

  @Delete(':key')
  async deleteSystemFile(@Param('key') key: string) {
    const file = await this.userFilesService.findByKey(key);
    if (!file) throw new NotFoundException('Файл не найден');

    await this.userFilesService.deleteByKey(key);
    return { message: 'Файл удален' };
  }

  @Get(':key')
  async getSystemFile(@Param('key') key: string) {
    const file = await this.userFilesService.findByKey(key);
    if (!file) throw new NotFoundException('Файл не найден');

    return file;
  }
}

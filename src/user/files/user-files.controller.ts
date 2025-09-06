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
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createTempMulterStorage } from 'src/services/files/custom-storage.service';
import { FileService } from '../../services/files/file.service';
import { UserFilesService } from './user-files.service';
import { EUSER_FILES_TYPE } from '@prisma/client';
import { Request, Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import * as path from 'path';
import * as fs from 'fs';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

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

    if (file.size > MAX_FILE_SIZE) {
      throw new HttpException({ message: 'Размер файла превышает 2MB.', info: { type: 'file' } }, HttpStatus.BAD_REQUEST);
    }

    const savedFiles = await this.fileService.moveFilesToStorage([file], user.user.id, 'files', key, false);
    const fileMeta = savedFiles[0];

    await this.userFilesService.saveOrReplace(key.toUpperCase() as EUSER_FILES_TYPE, fileMeta, user.user.id);

    return { message: 'Файл успешно загружен', file: fileMeta };
  }

  @Delete(':key')
  async deleteUserFile(@Param('key') key: string, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const file = await this.userFilesService.findByKey(key.toUpperCase() as EUSER_FILES_TYPE, user.user.id);
    if (!file) throw new NotFoundException('Файл не найден');

    await this.userFilesService.deleteByKey(key.toUpperCase() as EUSER_FILES_TYPE, user.user.id);
    return { message: 'Файл удален' };
  }

  @Get(':key')
  async getUserFile(@Param('key') key: string, @Req() request: Request) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'auth' } }, HttpStatus.BAD_REQUEST);
    }

    const file = await this.userFilesService.findByKey(key.toUpperCase() as EUSER_FILES_TYPE, user.user.id);
    if (!file) throw new NotFoundException('Файл не найден');

    return file;
  }

  @Get('/download/:key')
  async serveUserFile(@Param('key') key: string, @Req() request: Request, @Res() res: Response) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user?.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'auth' } }, HttpStatus.UNAUTHORIZED);
    }

    const file = await this.userFilesService.findByKey(key.toUpperCase() as EUSER_FILES_TYPE, user.user.id);

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const filePath = path.join(process.cwd(), file.path);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Файл на диске не найден');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

    return res.sendFile(filePath);
  }

  @Get('/view/:key')
  async viewUserFile(@Param('key') key: string, @Req() request: Request, @Res() res: Response) {
    const user = await this.authService.getUserFromTokens(request);

    if (!user?.user) {
      throw new HttpException({ message: 'Пользователь не авторизован.', info: { type: 'auth' } }, HttpStatus.UNAUTHORIZED);
    }

    const file = await this.userFilesService.findByKey(key.toUpperCase() as EUSER_FILES_TYPE, user.user.id);

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const filePath = path.join(process.cwd(), file.path);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Файл на диске не найден');
    }

    res.setHeader('Cache-Control', 'private, max-age=604800');

    return res.sendFile(filePath);
  }

  @Get('/view/:id/avatar')
  async viewUserAvatar(@Param('id') id: string, @Res() res: Response) {
    const file = await this.userFilesService.findByKey(EUSER_FILES_TYPE.AVATAR, Number(id));

    if (!file) {
      throw new NotFoundException('Файл не найден');
    }

    const filePath = path.join(process.cwd(), file.path);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Файл на диске не найден');
    }

    res.setHeader('Cache-Control', 'private, max-age=604800');

    return res.sendFile(filePath);
  }
}

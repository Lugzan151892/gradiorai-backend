import { Controller, Post, Delete, UploadedFile, UseInterceptors, Param, Get, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createTempMulterStorage } from 'src/services/files/custom-storage.service';
import { FileService } from '../../services/files/file.service';
import { SystemFilesService } from './system-files.service';

@Controller('system/files')
export class SystemFilesController {
  constructor(
    private readonly fileService: FileService,
    private readonly systemFilesService: SystemFilesService
  ) {}

  @Post(':key')
  @UseInterceptors(FileInterceptor('file', { storage: createTempMulterStorage() }))
  async uploadSystemFile(@Param('key') key: string, @UploadedFile() file: Express.Multer.File) {
    const savedFiles = await this.fileService.moveFilesToStorage([file], 0, 'system', key, true);

    const fileMeta = savedFiles[0];

    await this.systemFilesService.saveOrReplace(key, fileMeta);

    return { message: 'Файл успешно загружен', file: fileMeta };
  }

  @Delete(':key')
  async deleteSystemFile(@Param('key') key: string) {
    const file = await this.systemFilesService.findByKey(key);
    if (!file) throw new NotFoundException('Файл не найден');

    await this.systemFilesService.deleteByKey(key);
    return { message: 'Файл удален' };
  }

  @Get()
  async getSystemFiles() {
    return this.systemFilesService.findAll();
  }

  @Get(':key')
  async getSystemFile(@Param('key') key: string) {
    const file = await this.systemFilesService.findByKey(key);
    if (!file) throw new NotFoundException('Файл не найден');

    return file;
  }
}

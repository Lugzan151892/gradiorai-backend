import { Controller, Get, Post, Patch, Body, Query, Param, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { TranslationsService } from './translations.service';
import { UpdateTranslationDto } from './dto/update-translation.dto';
import { ImportQueryDto } from './dto/import-translation.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('translations')
export class TranslationsController {
  constructor(private svc: TranslationsService) {}

  // экспорт (скачивание). open для админов — требовать авторизацию в проде
  @Get('export')
  async export(@Query('locale') locale: string | undefined, @Res() res: Response) {
    const data = await this.svc.exportTranslations(locale);
    const filename = `translations-${locale ?? 'all'}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  // импорт: можно отправлять JSON в body или загружать файл multipart/form-data (поле "file")
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('overwrite') overwriteStr: string | undefined
  ) {
    const overwrite = overwriteStr === 'true';
    const json = file ? JSON.parse(file.buffer.toString()) : body;
    await this.svc.importTranslations(json, overwrite);
    return { success: true };
  }

  // апдейт одной строки
  @Patch('update')
  async update(@Body() dto: UpdateTranslationDto) {
    console.log(dto);
    return this.svc.upsertTranslation(dto);
  }

  // получить namespace (locale + namespace)
  @Get(':locale/:namespace')
  async getNamespace(@Param('locale') locale: string, @Param('namespace') namespace: string) {
    return this.svc.getNamespace(locale, namespace);
  }

  // получить конкретный ключ
  @Get(':locale/:namespace/:key')
  async getKey(@Param('locale') locale: string, @Param('namespace') namespace: string, @Param('key') key: string) {
    const value = await this.svc.getKey(locale, namespace, key);
    return { value };
  }
}

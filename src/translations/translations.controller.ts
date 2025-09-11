import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { TranslationsService } from '@/translations/translations.service';
import { UpdateTranslationDto } from '@/translations/dto/update-translation.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { RequireAdmin } from '@/auth/decorators/auth.decorator';
import { AuthUser, User } from '@/auth/decorators/user.decorator';

@Controller('translations')
export class TranslationsController {
  constructor(
    private svc: TranslationsService,
    private configService: ConfigService
  ) {}

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
  @RequireAdmin()
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('overwrite') overwriteStr: string | undefined,
  ) {
    const overwrite = overwriteStr === 'true';
    const json = file ? JSON.parse(file.buffer.toString()) : body;
    await this.svc.importTranslations(json, overwrite);
    return { success: true };
  }

  @Patch('update')
  @RequireAdmin()
  async update(@Body() dto: UpdateTranslationDto, @Req() request: Request, @User() user: AuthUser) {
    if (!user.user?.admin && (!dto.password || dto.password !== this.configService.get('TRANSLATION_PASSWORD'))) {
      throw new HttpException(
        { message: 'Пользователь не авторизован или недостаточно прав.', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }
    return this.svc.upsertTranslation(dto);
  }

  @Get(':locale/:namespace')
  async getNamespace(@Param('locale') locale: string, @Param('namespace') namespace: string) {
    return this.svc.getNamespace(locale, namespace);
  }

  @Get(':locale/:namespace/:key')
  async getKey(@Param('locale') locale: string, @Param('namespace') namespace: string, @Param('key') key: string) {
    const value = await this.svc.getKey(locale, namespace, key);
    return { value };
  }

  @Delete(':locale/:namespace/:key')
  @RequireAdmin()
  async deleteKey(
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
    @Param('key') key: string,
  ) {
    return this.svc.deleteKey(locale, namespace, key);
  }
}

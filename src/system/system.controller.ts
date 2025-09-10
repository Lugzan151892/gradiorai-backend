import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response, Request } from 'express';
import { GptService, IGptSettings } from '@/gpt/gpt.service';
import { EGPT_SETTINGS_TYPE } from '@/utils/interfaces/gpt/interfaces';
import { RequireAdmin } from '@/auth/decorators/auth.decorator';

@Controller('system')
export class SystemController {
  constructor(private readonly gptService: GptService) {}
  @Get('logs')
  @RequireAdmin()
  async getLogs(@Res() res: Response) {
    const logFilePath = path.join(__dirname, '..', '..', 'logs', 'combined.log');

    if (fs.existsSync(logFilePath)) {
      const result = fs.readFile(logFilePath, 'utf-8', (err, data) => {
        if (err) {
          throw new HttpException(err.message || 'Logs failed', HttpStatus.BAD_REQUEST);
        }

        const parsedData = data.split('\r\n');
        return res.send(parsedData.slice(-100));
      });
      return result;
    } else {
      throw new HttpException('Log file not found', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('gpt-settings')
  @RequireAdmin()
  async getGptSettings(@Query() query: { type?: EGPT_SETTINGS_TYPE }) {
    if (!query.type || !EGPT_SETTINGS_TYPE[query.type]) {
      throw new HttpException(
        { message: 'Некорректно указан тип настроек EGPT_SETTINGS_TYPE', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const settings = await this.gptService.getSettings(query.type);

    return settings;
  }

  @Post('update-gpt-settings')
  @RequireAdmin()
  async updateQuestionProgress(
    @Body()
    body: {
      settings: IGptSettings;
      type: EGPT_SETTINGS_TYPE;
    }
  ) {
    if (!body.type || !EGPT_SETTINGS_TYPE[body.type]) {
      throw new HttpException(
        { message: 'Не указан тип настроек EGPT_SETTINGS_TYPE', info: { type: 'admin' } },
        HttpStatus.BAD_REQUEST
      );
    }

    const result = await this.gptService.updateGptSettings(body.settings, body.type);

    return result;
  }

  @Get('backups')
  @RequireAdmin()
  async getBackupFiles(@Res() res: Response, @Req() request: Request) {
    const backupDirPath = path.join(__dirname, '..', '..', 'db-backups');

    const files = fs
      .readdirSync(backupDirPath)
      .filter((file) => file.endsWith('.sql'))
      .map((file) => ({
        name: file,
        path: path.join(backupDirPath, file),
        size: fs.statSync(path.join(backupDirPath, file)).size,
        createdAt: fs.statSync(path.join(backupDirPath, file)).ctime,
      }));

    return res.send(files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
  }

  @Get('/backups/download/:name')
  @RequireAdmin()
  async downloadBackupFile(@Param('name') name: string, @Req() request: Request, @Res() res: Response) {
    if (name.includes('..') || name.includes('/')) {
      throw new HttpException('Некорректное имя файла', HttpStatus.BAD_REQUEST);
    }

    const backupDirPath = path.join(__dirname, '..', '..', 'db-backups');
    const filePath = path.join(backupDirPath, name);

    if (!fs.existsSync(filePath)) {
      throw new HttpException({ message: 'Файл бэкапа не найден.', info: { type: 'file' } }, HttpStatus.NOT_FOUND);
    }

    res.setHeader('Cache-Control', 'private, max-age=604800');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);

    return res.sendFile(filePath);
  }
}

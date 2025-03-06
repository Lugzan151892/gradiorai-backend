import { Controller, Get, HttpException, HttpStatus, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller('system')
export class SystemController {
  @Get('logs')
  getLogs(@Res() res: Response) {
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
}

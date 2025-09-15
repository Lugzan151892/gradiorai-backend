import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { winstonConfig } from '@/config/winston/winston.config';

@Injectable()
export class IpLoggerMiddleware implements NestMiddleware {
  constructor() {}

  use(req: Request, _: Response, next: NextFunction) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const endpoint = req.originalUrl;
    winstonConfig.info(`Incoming ${req.method} request from IP: ${ip} to endpoint: ${endpoint}`);
    next();
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
// import { Logger } from 'winston';
// import { Inject } from '@nestjs/common';
import { winstonConfig } from '../config/winston/winston.config';

@Injectable()
export class IpLoggerMiddleware implements NestMiddleware {
  constructor() {}

  use(req: Request, _: Response, next: NextFunction) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    winstonConfig.info(`Request from IP: ${ip}`);
    next();
  }
}

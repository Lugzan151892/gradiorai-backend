import * as winston from 'winston';
import * as path from 'path';

const logsDir = path.resolve(__dirname, '../../../logs');

const nestLevels = {
  levels: {
    error: 0,
    warn: 1,
    loggs: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    log: 'green',
    info: 'blue',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'gray',
  },
};

export const winstonConfig = winston.createLogger({
  levels: nestLevels.levels,
  transports: [
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
      format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.json()),
    }),
  ],
});

winston.addColors(nestLevels.colors);

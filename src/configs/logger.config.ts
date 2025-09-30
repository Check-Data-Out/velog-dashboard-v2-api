import fs from 'fs';
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const logDir = `${process.cwd()}/logs`;
const errorLogDir = `${logDir}/error`;

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
if (!fs.existsSync(errorLogDir)) {
  fs.mkdirSync(errorLogDir);
}

const jsonFormat = winston.format.printf((info) => {
  // info.message가 객체인 경우
  if (typeof info.message === 'object' && info.message !== null) {
    return JSON.stringify({
      timestamp: info.timestamp,
      level: info.level.toUpperCase(),
      logger: info.logger || 'default',
      ...info.message, // 로그 데이터 평탄화
    });
  }

  return JSON.stringify({
    timestamp: info.timestamp,
    level: info.level.toUpperCase(),
    logger: 'default',
    message: info.message,
  });
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSSZ',
    }),
    jsonFormat,
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    new winstonDaily({
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      filename: `%DATE%.log`,
      dirname: logDir,
      maxFiles: '7d',
    }),
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      filename: `%DATE%-error.log`,
      dirname: errorLogDir,
      maxFiles: '7d',
    }),
  ],
});

export default logger;

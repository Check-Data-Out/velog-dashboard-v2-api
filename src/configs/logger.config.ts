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

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`;
    }),
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
      filename: `%DATE%error.log`,
      dirname: errorLogDir,
      maxFiles: '7d',
    }),
  ],
});
export default logger;

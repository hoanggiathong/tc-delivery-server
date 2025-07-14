import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Custom format to remove quotes and format properly
const customFormat = winston.format.printf(info => {
  // Remove quotes from message if it's a string
  let message: string = String(info.message);
  if (typeof info.message === 'string') {
    // Remove surrounding quotes only if they match
    message = info.message.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    // Don't remove quotes from JSON strings or quotes in the middle
  }

  return `${info.timestamp} ${info.level}: ${message}`;
});

// Console format (with colors)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  customFormat
);

// File format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.uncolorize(),
  customFormat
);

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Ensure base log directories exist
const currentYear = new Date().getFullYear();
const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
const logBasePath = path.join('logs', String(currentYear), currentMonth);
ensureDirectoryExists(logBasePath);

// Create daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logBasePath, '%DATE%.log'),
  datePattern: 'DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: fileFormat,
  createSymlink: true,
  symlinkName: 'logs/current.log',
});

// Create daily rotate file transport for error logs
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logBasePath, 'error-%DATE%.log'),
  datePattern: 'DD',
  level: 'error',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format: fileFormat,
  createSymlink: true,
  symlinkName: 'logs/current-error.log',
});

// Define transports
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
  allLogsTransport,
  errorLogsTransport,
];

// Create the logger
const Logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logBasePath, 'exceptions-%DATE%.log'),
      datePattern: 'DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      createSymlink: true,
      symlinkName: 'logs/current-exceptions.log',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logBasePath, 'rejections-%DATE%.log'),
      datePattern: 'DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      createSymlink: true,
      symlinkName: 'logs/current-rejections.log',
    }),
  ],
});

// Log rotation events
allLogsTransport.on('rotate', (oldFilename, newFilename) => {
  Logger.info(`Log rotated from ${oldFilename} to ${newFilename}`);
});

errorLogsTransport.on('rotate', (oldFilename, newFilename) => {
  Logger.info(`Error log rotated from ${oldFilename} to ${newFilename}`);
});

// Log when new log files are created
allLogsTransport.on('new', newFilename => {
  Logger.info(`New log file created: ${newFilename}`);
});

// Function to update log paths when month changes
const updateLogPaths = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const newLogPath = path.join('logs', String(year), month);

  if (newLogPath !== logBasePath) {
    ensureDirectoryExists(newLogPath);
    Logger.info(`Log directory updated to: ${newLogPath}`);
  }
};

// Check for month change every hour
setInterval(updateLogPaths, 60 * 60 * 1000);

export default Logger;


import fs from 'fs';
import path from 'path';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
type LogFormat = 'text' | 'json';

const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL?.toUpperCase() as LogLevel) || 'DEBUG';
const LOG_FORMAT: LogFormat = (process.env.LOG_FORMAT?.toLowerCase() as LogFormat) || 'text';
const LOG_FILE_PATH = path.join(process.cwd(), 'public', 'debug.log');

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const performanceTimers = new Map<string, number>();

class Logger {
  private category: string;

  constructor(category = 'APP') {
    this.category = category;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
  }

  private formatMessage(level: LogLevel, message: string, context?: object): string {
    const timestamp = new Date().toISOString();
    
    if (LOG_FORMAT === 'json') {
      const logEntry = {
        timestamp,
        level,
        category: this.category,
        message,
        ...context,
      };
      return JSON.stringify(logEntry);
    }

    let formattedMessage = `[${timestamp}] [${level}] [${this.category}] ${message}`;
    if (context) {
      formattedMessage += `\n${JSON.stringify(context, null, 2)}`;
    }
    return formattedMessage;
  }

  private writeLog(level: LogLevel, message: string, context?: object) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context);
    const rawMessage = `${formattedMessage}\n`;

    // Write to console
    if (level === 'ERROR') {
      console.error(formattedMessage);
    } else if (level === 'WARN') {
      console.warn(formattedMessage);
    } else {
      console.log(formattedMessage);
    }

    // Append to log file
    try {
      fs.appendFileSync(LOG_FILE_PATH, rawMessage);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  public withCategory(category: string): Logger {
    return new Logger(category);
  }

  public debug(message: string, context?: object) {
    this.writeLog('DEBUG', message, context);
  }

  public info(message: string, context?: object) {
    this.writeLog('INFO', message, context);
  }

  public warn(message: string, context?: object) {
    this.writeLog('WARN', message, context);
  }

  public error(message: string, error?: any, context?: object) {
    const errorContext = {
      ...context,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    };
    this.writeLog('ERROR', message, errorContext);
  }
  
  public time(label: string) {
    performanceTimers.set(label, Date.now());
  }

  public timeEnd(label: string) {
    const startTime = performanceTimers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.debug(`${label} took ${duration}ms`);
      performanceTimers.delete(label);
    }
  }
}

export const logger = new Logger();

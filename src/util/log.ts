export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level}: ${message}`;
  }

  debug(message: string): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message));
    }
  }

  info(message: string): void {
    if (this.level <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message));
    }
  }

  warn(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message));
    }
  }

  error(message: string): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message));
    }
  }

  success(message: string): void {
    console.log(`✅ ${message}`);
  }

  table(data: any[]): void {
    console.table(data);
  }
}

export const logger = new Logger(); 
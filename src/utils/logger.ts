/**
 * Logger utility for the Audio MCP Server
 * 
 * Provides structured logging with different levels and output formatting.
 */

import winston from 'winston';
import path from 'path';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  
  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        // Console output
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          )
        }),
        
        // File output
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'audio-mcp-server.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Error file output
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ]
    });
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
  
  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }
  
  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }
  
  public error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
    } else {
      this.logger.error(message, { error });
    }
  }
  
  public setLevel(level: string): void {
    this.logger.level = level;
  }
  
  public createChild(meta: object): winston.Logger {
    return this.logger.child(meta);
  }
}

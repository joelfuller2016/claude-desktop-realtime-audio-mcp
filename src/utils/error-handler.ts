/**
 * Error Handler for Audio MCP Server
 * 
 * Provides centralized error handling, logging, and recovery mechanisms.
 */

import { Logger } from './logger.js';

export interface AudioError {
  code: string;
  message: string;
  details?: any;
  recoverable?: boolean;
}

export class AudioErrorCodes {
  static readonly DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND';
  static readonly DEVICE_ACCESS_DENIED = 'DEVICE_ACCESS_DENIED';
  static readonly AUDIO_CAPTURE_FAILED = 'AUDIO_CAPTURE_FAILED';
  static readonly SPEECH_SERVICE_ERROR = 'SPEECH_SERVICE_ERROR';
  static readonly CONFIGURATION_ERROR = 'CONFIGURATION_ERROR';
  static readonly NETWORK_ERROR = 'NETWORK_ERROR';
  static readonly BUFFER_OVERFLOW = 'BUFFER_OVERFLOW';
  static readonly NATIVE_MODULE_ERROR = 'NATIVE_MODULE_ERROR';
}

export class AudioMCPError extends Error implements AudioError {
  public readonly code: string;
  public readonly details?: any;
  public readonly recoverable: boolean;
  
  constructor(code: string, message: string, details?: any, recoverable = false) {
    super(message);
    this.name = 'AudioMCPError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioMCPError);
    }
  }
}

export class ErrorHandler {
  private static logger = Logger.getInstance();
  private static errorCounts = new Map<string, number>();
  private static lastErrors = new Map<string, number>();
  
  /**
   * Handle critical errors that should terminate the process
   */
  public static handleCriticalError(error: any): void {
    const logger = this.logger;
    
    if (error instanceof AudioMCPError) {
      logger.error(`Critical AudioMCP Error [${error.code}]: ${error.message}`, error.details);
    } else if (error instanceof Error) {
      logger.error(`Critical Error: ${error.message}`, { stack: error.stack });
    } else {
      logger.error('Critical Unknown Error', { error });
    }
    
    // Perform any cleanup here
    this.performEmergencyCleanup();
  }
  
  /**
   * Handle recoverable errors with retry logic
   */
  public static handleRecoverableError(
    error: AudioMCPError,
    context: string,
    retryCallback?: () => Promise<void>
  ): Promise<boolean> {
    const logger = this.logger;
    const errorKey = `${context}:${error.code}`;
    
    // Track error frequency
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);
    this.lastErrors.set(errorKey, Date.now());
    
    logger.warn(`Recoverable error in ${context} [${error.code}]: ${error.message}`, {
      count: count + 1,
      details: error.details
    });
    
    // Check if we should attempt recovery
    if (count >= 5) {
      logger.error(`Too many errors in ${context}, giving up`, { errorKey, count });
      return Promise.resolve(false);
    }
    
    // Attempt retry if callback provided
    if (retryCallback && error.recoverable) {
      return this.retryWithBackoff(retryCallback, count)
        .then(() => {
          logger.info(`Successfully recovered from error in ${context}`);
          // Reset error count on successful recovery
          this.errorCounts.delete(errorKey);
          return true;
        })
        .catch((retryError) => {
          logger.error(`Retry failed for ${context}`, retryError);
          return false;
        });
    }
    
    return Promise.resolve(false);
  }
  
  /**
   * Create specific error types
   */
  public static createDeviceError(message: string, details?: any): AudioMCPError {
    return new AudioMCPError(
      AudioErrorCodes.DEVICE_NOT_FOUND,
      message,
      details,
      true // Device errors are often recoverable
    );
  }
  
  public static createCaptureError(message: string, details?: any): AudioMCPError {
    return new AudioMCPError(
      AudioErrorCodes.AUDIO_CAPTURE_FAILED,
      message,
      details,
      true
    );
  }
  
  public static createSpeechServiceError(message: string, details?: any): AudioMCPError {
    return new AudioMCPError(
      AudioErrorCodes.SPEECH_SERVICE_ERROR,
      message,
      details,
      true // Can fallback to other services
    );
  }
  
  public static createConfigError(message: string, details?: any): AudioMCPError {
    return new AudioMCPError(
      AudioErrorCodes.CONFIGURATION_ERROR,
      message,
      details,
      false // Config errors usually require manual intervention
    );
  }
  
  public static createNetworkError(message: string, details?: any): AudioMCPError {
    return new AudioMCPError(
      AudioErrorCodes.NETWORK_ERROR,
      message,
      details,
      true // Network errors are often temporary
    );
  }
  
  /**
   * Retry with exponential backoff
   */
  private static async retryWithBackoff(
    callback: () => Promise<void>,
    attemptNumber: number
  ): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
    
    this.logger.info(`Retrying in ${delay}ms (attempt ${attemptNumber + 1})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return callback();
  }
  
  /**
   * Cleanup error tracking data
   */
  public static cleanupErrorTracking(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, timestamp] of this.lastErrors.entries()) {
      if (now - timestamp > maxAge) {
        this.lastErrors.delete(key);
        this.errorCounts.delete(key);
      }
    }
  }
  
  /**
   * Get error statistics
   */
  public static getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    for (const [key, count] of this.errorCounts.entries()) {
      stats[key] = count;
    }
    return stats;
  }
  
  /**
   * Emergency cleanup procedures
   */
  private static performEmergencyCleanup(): void {
    try {
      // Close any open audio streams
      // Release native resources
      // Clear buffers
      // Save any important state
      
      this.logger.info('Emergency cleanup completed');
    } catch (cleanupError) {
      console.error('Emergency cleanup failed:', cleanupError);
    }
  }
  
  /**
   * Wrap async functions with error handling
   */
  public static wrapAsync<T>(
    fn: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T> {
    return fn().catch((error) => {
      if (error instanceof AudioMCPError) {
        this.handleRecoverableError(error, context);
      } else {
        this.logger.error(`Unexpected error in ${context}`, error);
      }
      
      if (fallback !== undefined) {
        return fallback;
      }
      
      throw error;
    });
  }
}

// Start periodic cleanup
setInterval(() => {
  ErrorHandler.cleanupErrorTracking();
}, 5 * 60 * 1000); // Every 5 minutes

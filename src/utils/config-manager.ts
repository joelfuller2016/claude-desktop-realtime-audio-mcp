/**
 * Configuration Manager for Audio MCP Server
 * 
 * Handles loading and managing configuration from environment variables,
 * config files, and default values.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { Logger } from './logger.js';

// Configuration schema
const AudioConfigSchema = z.object({
  sampleRate: z.number().min(8000).max(96000).default(44100),
  channels: z.number().min(1).max(2).default(1),
  bufferSizeMs: z.number().min(10).max(1000).default(100),
  deviceId: z.string().optional()
});

const SpeechConfigSchema = z.object({
  defaultService: z.enum(['whisper', 'azure', 'google']).default('whisper'),
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('whisper-1')
  }).optional(),
  azure: z.object({
    subscriptionKey: z.string().optional(),
    region: z.string().optional(),
    language: z.string().default('en-US')
  }).optional(),
  google: z.object({
    keyFilename: z.string().optional(),
    projectId: z.string().optional(),
    language: z.string().default('en-US')
  }).optional()
});

const ServerConfigSchema = z.object({
  logLevel: z.string().default('info'),
  maxConcurrentStreams: z.number().min(1).max(10).default(3),
  transcriptionHistoryLimit: z.number().min(10).max(1000).default(100)
});

export const ConfigSchema = z.object({
  audio: AudioConfigSchema,
  speech: SpeechConfigSchema,
  server: ServerConfigSchema
});

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;
  private logger: Logger;
  
  private constructor() {
    this.logger = Logger.getInstance();
  }
  
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  /**
   * Load configuration from environment and config files
   */
  public async load(): Promise<void> {
    try {
      // Load environment variables
      dotenv.config();
      
      // Try to load config file
      const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config.json');
      let fileConfig = {};
      
      if (existsSync(configPath)) {
        try {
          const configContent = readFileSync(configPath, 'utf8');
          fileConfig = JSON.parse(configContent);
          this.logger.info(`Loaded configuration from ${configPath}`);
        } catch (error) {
          this.logger.warn(`Failed to load config file from ${configPath}`, error);
        }
      }
      
      // Build configuration object
      const rawConfig = {
        audio: {
          sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE || '') || 44100,
          channels: parseInt(process.env.AUDIO_CHANNELS || '') || 1,
          bufferSizeMs: parseInt(process.env.AUDIO_BUFFER_SIZE_MS || '') || 100,
          deviceId: process.env.AUDIO_DEVICE_ID,
          ...((fileConfig as any)?.audio || {})
        },
        speech: {
          defaultService: process.env.DEFAULT_SPEECH_SERVICE || 'whisper',
          openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'whisper-1'
          },
          azure: {
            subscriptionKey: process.env.AZURE_SPEECH_KEY,
            region: process.env.AZURE_SPEECH_REGION,
            language: process.env.AZURE_SPEECH_LANGUAGE || 'en-US'
          },
          google: {
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            language: process.env.GOOGLE_SPEECH_LANGUAGE || 'en-US'
          },
          ...((fileConfig as any)?.speech || {})
        },
        server: {
          logLevel: process.env.LOG_LEVEL || 'info',
          maxConcurrentStreams: parseInt(process.env.MAX_CONCURRENT_STREAMS || '') || 3,
          transcriptionHistoryLimit: parseInt(process.env.TRANSCRIPTION_HISTORY_LIMIT || '') || 100,
          ...((fileConfig as any)?.server || {})
        }
      };
      
      // Validate and parse configuration
      this.config = ConfigSchema.parse(rawConfig);
      
      // Set log level
      this.logger.setLevel(this.config.server.logLevel);
      
      this.logger.info('Configuration loaded successfully');
      
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      throw new Error(`Configuration error: ${error}`);
    }
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }
  
  /**
   * Get audio configuration
   */
  public getAudioConfig(): Config['audio'] {
    return this.getConfig().audio;
  }
  
  /**
   * Get speech recognition configuration
   */
  public getSpeechConfig(): Config['speech'] {
    return this.getConfig().speech;
  }
  
  /**
   * Get server configuration
   */
  public getServerConfig(): Config['server'] {
    return this.getConfig().server;
  }
  
  /**
   * Update configuration at runtime
   */
  public updateConfig(updates: Partial<Config>): void {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    
    const newConfig = { ...this.config, ...updates };
    this.config = ConfigSchema.parse(newConfig);
    
    this.logger.info('Configuration updated');
  }
  
  /**
   * Validate speech service configuration
   */
  public validateSpeechServiceConfig(service: string): boolean {
    const speechConfig = this.getSpeechConfig();
    
    switch (service) {
      case 'whisper':
        return true; // Whisper can work locally without API key
        
      case 'azure':
        return !!(speechConfig.azure?.subscriptionKey && speechConfig.azure?.region);
        
      case 'google':
        return !!(speechConfig.google?.keyFilename || speechConfig.google?.projectId);
        
      default:
        return false;
    }
  }
  
  /**
   * Get available speech services
   */
  public getAvailableSpeechServices(): string[] {
    const services: string[] = [];
    
    // Whisper is always available
    services.push('whisper');
    
    if (this.validateSpeechServiceConfig('azure')) {
      services.push('azure');
    }
    
    if (this.validateSpeechServiceConfig('google')) {
      services.push('google');
    }
    
    return services;
  }
}

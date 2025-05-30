/**
 * Audio MCP Server Implementation
 * 
 * Implements the core MCP server functionality for real-time audio capture
 * and speech recognition integration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { AudioCaptureManager } from '../audio-module/audio-capture-manager.js';
import { SpeechServiceManager } from '../speech-recognition/speech-service-manager.js';
import { AudioDeviceManager } from '../audio-module/audio-device-manager.js';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../utils/config-manager.js';

/**
 * Schema definitions for MCP tools
 */
const StartAudioCaptureSchema = z.object({
  deviceId: z.string().optional(),
  sampleRate: z.number().min(8000).max(96000).optional(),
  channels: z.number().min(1).max(2).optional(),
  bufferSizeMs: z.number().min(10).max(1000).optional()
});

const TranscribeAudioSchema = z.object({
  service: z.enum(['whisper', 'azure', 'google']).optional(),
  language: z.string().optional(),
  continuous: z.boolean().optional()
});

const AudioDeviceSchema = z.object({
  includeProperties: z.boolean().optional()
});

/**
 * Main audio MCP server class
 */
export class AudioMCPServer {
  private server: Server;
  private logger: Logger;
  private config: ConfigManager;
  private audioCapture: AudioCaptureManager;
  private speechServices: SpeechServiceManager;
  private deviceManager: AudioDeviceManager;
  private isInitialized = false;
  
  constructor(server: Server) {
    this.server = server;
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
    this.audioCapture = new AudioCaptureManager();
    this.speechServices = new SpeechServiceManager();
    this.deviceManager = new AudioDeviceManager();
  }
  
  /**
   * Initialize the audio MCP server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.logger.info('Initializing Audio MCP Server');
      
      // Initialize managers
      await this.audioCapture.initialize();
      await this.speechServices.initialize();
      await this.deviceManager.initialize();
      
      // Register MCP tools
      this.registerTools();
      
      // Register MCP resources
      this.registerResources();
      
      this.isInitialized = true;
      this.logger.info('Audio MCP Server initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Audio MCP Server', error);
      throw error;
    }
  }
  
  /**
   * Register MCP tools
   */
  private registerTools(): void {
    // Start audio capture tool
    this.server.setRequestHandler('tools/call', async (request) => {
      if (request.params.name === 'startAudioCapture') {
        const args = StartAudioCaptureSchema.parse(request.params.arguments || {});
        return await this.handleStartAudioCapture(args);
      }
      
      if (request.params.name === 'stopAudioCapture') {
        return await this.handleStopAudioCapture();
      }
      
      if (request.params.name === 'transcribeAudio') {
        const args = TranscribeAudioSchema.parse(request.params.arguments || {});
        return await this.handleTranscribeAudio(args);
      }
      
      if (request.params.name === 'listAudioDevices') {
        const args = AudioDeviceSchema.parse(request.params.arguments || {});
        return await this.handleListAudioDevices(args);
      }
      
      throw new Error(`Unknown tool: ${request.params.name}`);
    });
    
    // List tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'startAudioCapture',
            description: 'Start real-time audio capture from microphone',
            inputSchema: {
              type: 'object',
              properties: {
                deviceId: {
                  type: 'string',
                  description: 'Audio device ID (optional, uses default if not specified)'
                },
                sampleRate: {
                  type: 'number',
                  description: 'Sample rate in Hz (default: 44100)',
                  minimum: 8000,
                  maximum: 96000
                },
                channels: {
                  type: 'number',
                  description: 'Number of audio channels (default: 1)',
                  minimum: 1,
                  maximum: 2
                },
                bufferSizeMs: {
                  type: 'number',
                  description: 'Buffer size in milliseconds (default: 100)',
                  minimum: 10,
                  maximum: 1000
                }
              }
            }
          },
          {
            name: 'stopAudioCapture',
            description: 'Stop real-time audio capture',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'transcribeAudio',
            description: 'Transcribe captured audio using speech recognition',
            inputSchema: {
              type: 'object',
              properties: {
                service: {
                  type: 'string',
                  enum: ['whisper', 'azure', 'google'],
                  description: 'Speech recognition service to use (default: whisper)'
                },
                language: {
                  type: 'string',
                  description: 'Language code (e.g., en-US, es-ES)'
                },
                continuous: {
                  type: 'boolean',
                  description: 'Enable continuous transcription (default: false)'
                }
              }
            }
          },
          {
            name: 'listAudioDevices',
            description: 'List available audio input devices',
            inputSchema: {
              type: 'object',
              properties: {
                includeProperties: {
                  type: 'boolean',
                  description: 'Include detailed device properties (default: false)'
                }
              }
            }
          }
        ]
      };
    });
  }
  
  /**
   * Register MCP resources
   */
  private registerResources(): void {
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: [
          {
            uri: 'audio://stream/live',
            name: 'Live Audio Stream',
            description: 'Real-time audio stream from microphone',
            mimeType: 'audio/wav'
          },
          {
            uri: 'audio://transcripts/recent',
            name: 'Recent Transcripts',
            description: 'Recently transcribed audio content',
            mimeType: 'application/json'
          },
          {
            uri: 'audio://devices/list',
            name: 'Audio Devices',
            description: 'List of available audio input devices',
            mimeType: 'application/json'
          }
        ]
      };
    });
    
    this.server.setRequestHandler('resources/read', async (request) => {
      const uri = request.params.uri;
      
      if (uri === 'audio://stream/live') {
        return await this.handleGetAudioStream();
      }
      
      if (uri === 'audio://transcripts/recent') {
        return await this.handleGetRecentTranscripts();
      }
      
      if (uri === 'audio://devices/list') {
        return await this.handleGetDeviceList();
      }
      
      throw new Error(`Unknown resource URI: ${uri}`);
    });
  }
  
  /**
   * Tool handlers
   */
  private async handleStartAudioCapture(args: z.infer<typeof StartAudioCaptureSchema>) {
    try {
      const config = {
        deviceId: args.deviceId || 'default',
        sampleRate: args.sampleRate || 44100,
        channels: args.channels || 1,
        bufferSizeMs: args.bufferSizeMs || 100
      };
      
      await this.audioCapture.startCapture(config);
      
      return {
        content: [{
          type: 'text',
          text: `Audio capture started successfully with device: ${config.deviceId}`
        }]
      };
    } catch (error) {
      this.logger.error('Failed to start audio capture', error);
      throw error;
    }
  }
  
  private async handleStopAudioCapture() {
    try {
      await this.audioCapture.stopCapture();
      
      return {
        content: [{
          type: 'text',
          text: 'Audio capture stopped successfully'
        }]
      };
    } catch (error) {
      this.logger.error('Failed to stop audio capture', error);
      throw error;
    }
  }
  
  private async handleTranscribeAudio(args: z.infer<typeof TranscribeAudioSchema>) {
    try {
      const result = await this.speechServices.transcribe({
        service: args.service || 'whisper',
        language: args.language || 'en-US',
        continuous: args.continuous || false
      });
      
      return {
        content: [{
          type: 'text',
          text: `Transcription: ${result.text}`
        }]
      };
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);
      throw error;
    }
  }
  
  private async handleListAudioDevices(args: z.infer<typeof AudioDeviceSchema>) {
    try {
      const devices = await this.deviceManager.listDevices(args.includeProperties || false);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(devices, null, 2)
        }]
      };
    } catch (error) {
      this.logger.error('Failed to list audio devices', error);
      throw error;
    }
  }
  
  /**
   * Resource handlers
   */
  private async handleGetAudioStream() {
    const stream = await this.audioCapture.getAudioStream();
    return {
      contents: [{
        uri: 'audio://stream/live',
        mimeType: 'audio/wav',
        text: 'Live audio stream available'
      }]
    };
  }
  
  private async handleGetRecentTranscripts() {
    const transcripts = await this.speechServices.getRecentTranscripts();
    return {
      contents: [{
        uri: 'audio://transcripts/recent',
        mimeType: 'application/json',
        text: JSON.stringify(transcripts, null, 2)
      }]
    };
  }
  
  private async handleGetDeviceList() {
    const devices = await this.deviceManager.listDevices(true);
    return {
      contents: [{
        uri: 'audio://devices/list',
        mimeType: 'application/json',
        text: JSON.stringify(devices, null, 2)
      }]
    };
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up Audio MCP Server');
      
      await this.audioCapture.cleanup();
      await this.speechServices.cleanup();
      await this.deviceManager.cleanup();
      
      this.isInitialized = false;
      this.logger.info('Audio MCP Server cleanup completed');
      
    } catch (error) {
      this.logger.error('Error during cleanup', error);
      throw error;
    }
  }
}

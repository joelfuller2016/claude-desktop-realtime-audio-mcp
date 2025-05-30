/**
 * Speech Service Manager
 * 
 * Manages integration with multiple speech-to-text services including
 * OpenAI Whisper, Azure Speech Services, and Google Speech-to-Text.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../utils/config-manager.js';
import { ErrorHandler, AudioMCPError } from '../utils/error-handler.js';
import { AudioChunk } from '../audio-module/audio-capture-manager.js';

export interface TranscriptionRequest {
  service: 'whisper' | 'azure' | 'google';
  language?: string;
  continuous?: boolean;
  audioData?: AudioChunk[];
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  service: string;
  timestamp: number;
  language?: string;
  segments?: TranscriptionSegment[];
}

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Transcript {
  id: string;
  text: string;
  timestamp: number;
  service: string;
  confidence: number;
  audioChunks: number;
  duration: number;
}

/**
 * Abstract base class for speech services
 */
abstract class SpeechService {
  protected logger: Logger;
  protected config: ConfigManager;
  
  constructor() {
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }
  
  abstract initialize(): Promise<void>;
  abstract transcribe(audioChunks: AudioChunk[], language?: string): Promise<TranscriptionResult>;
  abstract cleanup(): Promise<void>;
  abstract isAvailable(): boolean;
}

/**
 * OpenAI Whisper service implementation
 */
class WhisperService extends SpeechService {
  private isInitialized = false;
  
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Whisper service');
      
      // Check if OpenAI API key is available for cloud Whisper
      const speechConfig = this.config.getSpeechConfig();
      const hasApiKey = !!speechConfig.openai?.apiKey;
      
      if (hasApiKey) {
        this.logger.info('Using OpenAI Whisper API');
      } else {
        this.logger.info('Using local Whisper implementation');
      }
      
      this.isInitialized = true;
      
    } catch (error) {
      this.logger.error('Failed to initialize Whisper service', error);
      throw error;
    }
  }
  
  async transcribe(audioChunks: AudioChunk[], language = 'en'): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      throw ErrorHandler.createSpeechServiceError('Whisper service not initialized');
    }
    
    try {
      const speechConfig = this.config.getSpeechConfig();
      
      // Combine audio chunks
      const combinedAudio = this.combineAudioChunks(audioChunks);
      
      if (speechConfig.openai?.apiKey) {
        return await this.transcribeWithAPI(combinedAudio, language);
      } else {
        return await this.transcribeLocally(combinedAudio, language);
      }
      
    } catch (error) {
      this.logger.error('Whisper transcription failed', error);
      throw ErrorHandler.createSpeechServiceError('Whisper transcription failed', error);
    }
  }
  
  private async transcribeWithAPI(audioData: Float32Array, language: string): Promise<TranscriptionResult> {
    // This would implement OpenAI Whisper API calls
    // For now, return mock result
    this.logger.info('Using OpenAI Whisper API for transcription');
    
    return {
      text: "Mock transcription from OpenAI Whisper API",
      confidence: 0.95,
      service: 'whisper-api',
      timestamp: Date.now(),
      language
    };
  }
  
  private async transcribeLocally(audioData: Float32Array, language: string): Promise<TranscriptionResult> {
    // This would implement local Whisper model processing
    // For now, return mock result
    this.logger.info('Using local Whisper model for transcription');
    
    return {
      text: "Mock transcription from local Whisper model",
      confidence: 0.90,
      service: 'whisper-local',
      timestamp: Date.now(),
      language
    };
  }
  
  private combineAudioChunks(chunks: AudioChunk[]): Float32Array {
    if (chunks.length === 0) {
      return new Float32Array(0);
    }
    
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const combined = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk.data, offset);
      offset += chunk.data.length;
    }
    
    return combined;
  }
  
  isAvailable(): boolean {
    return this.isInitialized;
  }
  
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.logger.info('Whisper service cleanup completed');
  }
}

/**
 * Azure Speech Services implementation
 */
class AzureSpeechService extends SpeechService {
  private isInitialized = false;
  
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Azure Speech service');
      
      const speechConfig = this.config.getSpeechConfig();
      
      if (!speechConfig.azure?.subscriptionKey || !speechConfig.azure?.region) {
        throw new Error('Azure Speech credentials not configured');
      }
      
      // Initialize Azure Speech SDK here
      this.isInitialized = true;
      
    } catch (error) {
      this.logger.error('Failed to initialize Azure Speech service', error);
      throw error;
    }
  }
  
  async transcribe(audioChunks: AudioChunk[], language = 'en-US'): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      throw ErrorHandler.createSpeechServiceError('Azure Speech service not initialized');
    }
    
    try {
      // This would implement Azure Speech SDK calls
      this.logger.info('Using Azure Speech service for transcription');
      
      return {
        text: "Mock transcription from Azure Speech Services",
        confidence: 0.92,
        service: 'azure-speech',
        timestamp: Date.now(),
        language
      };
      
    } catch (error) {
      this.logger.error('Azure Speech transcription failed', error);
      throw ErrorHandler.createSpeechServiceError('Azure Speech transcription failed', error);
    }
  }
  
  isAvailable(): boolean {
    const speechConfig = this.config.getSpeechConfig();
    return this.isInitialized && !!(speechConfig.azure?.subscriptionKey && speechConfig.azure?.region);
  }
  
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.logger.info('Azure Speech service cleanup completed');
  }
}

/**
 * Google Speech-to-Text implementation
 */
class GoogleSpeechService extends SpeechService {
  private isInitialized = false;
  
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Google Speech service');
      
      const speechConfig = this.config.getSpeechConfig();
      
      if (!speechConfig.google?.keyFilename && !speechConfig.google?.projectId) {
        throw new Error('Google Speech credentials not configured');
      }
      
      // Initialize Google Speech SDK here
      this.isInitialized = true;
      
    } catch (error) {
      this.logger.error('Failed to initialize Google Speech service', error);
      throw error;
    }
  }
  
  async transcribe(audioChunks: AudioChunk[], language = 'en-US'): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      throw ErrorHandler.createSpeechServiceError('Google Speech service not initialized');
    }
    
    try {
      // This would implement Google Speech SDK calls
      this.logger.info('Using Google Speech service for transcription');
      
      return {
        text: "Mock transcription from Google Speech-to-Text",
        confidence: 0.94,
        service: 'google-speech',
        timestamp: Date.now(),
        language
      };
      
    } catch (error) {
      this.logger.error('Google Speech transcription failed', error);
      throw ErrorHandler.createSpeechServiceError('Google Speech transcription failed', error);
    }
  }
  
  isAvailable(): boolean {
    const speechConfig = this.config.getSpeechConfig();
    return this.isInitialized && !!(speechConfig.google?.keyFilename || speechConfig.google?.projectId);
  }
  
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.logger.info('Google Speech service cleanup completed');
  }
}

/**
 * Main Speech Service Manager
 */
export class SpeechServiceManager extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private services: Map<string, SpeechService> = new Map();
  private transcripts: Transcript[] = [];
  private isInitialized = false;
  private continuousTranscription = false;
  private audioBuffer: AudioChunk[] = [];
  
  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
  }
  
  /**
   * Initialize all available speech services
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Speech Service Manager');
      
      // Initialize Whisper (always available)
      const whisperService = new WhisperService();
      await whisperService.initialize();
      this.services.set('whisper', whisperService);
      
      // Initialize Azure Speech if configured
      try {
        const azureService = new AzureSpeechService();
        await azureService.initialize();
        this.services.set('azure', azureService);
        this.logger.info('Azure Speech service initialized');
      } catch (error) {
        this.logger.warn('Azure Speech service not available', error);
      }
      
      // Initialize Google Speech if configured
      try {
        const googleService = new GoogleSpeechService();
        await googleService.initialize();
        this.services.set('google', googleService);
        this.logger.info('Google Speech service initialized');
      } catch (error) {
        this.logger.warn('Google Speech service not available', error);
      }
      
      this.isInitialized = true;
      this.logger.info(`Speech Service Manager initialized with ${this.services.size} services`);
      
    } catch (error) {
      this.logger.error('Failed to initialize Speech Service Manager', error);
      throw error;
    }
  }
  
  /**
   * Transcribe audio using specified service
   */
  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResult> {
    if (!this.isInitialized) {
      throw ErrorHandler.createSpeechServiceError('Speech Service Manager not initialized');
    }
    
    try {
      const service = this.services.get(request.service);
      
      if (!service) {
        throw ErrorHandler.createSpeechServiceError(`Service ${request.service} not available`);
      }
      
      if (!service.isAvailable()) {
        throw ErrorHandler.createSpeechServiceError(`Service ${request.service} is not available`);
      }
      
      // Use buffered audio if no audio data provided
      const audioChunks = request.audioData || this.audioBuffer;
      
      if (audioChunks.length === 0) {
        throw ErrorHandler.createSpeechServiceError('No audio data available for transcription');
      }
      
      const result = await service.transcribe(audioChunks, request.language);
      
      // Store transcript
      const transcript: Transcript = {
        id: this.generateTranscriptId(),
        text: result.text,
        timestamp: result.timestamp,
        service: result.service,
        confidence: result.confidence,
        audioChunks: audioChunks.length,
        duration: audioChunks.reduce((sum, chunk) => sum + chunk.duration, 0)
      };
      
      this.transcripts.push(transcript);
      
      // Limit transcript history
      const maxTranscripts = this.config.getServerConfig().transcriptionHistoryLimit;
      if (this.transcripts.length > maxTranscripts) {
        this.transcripts = this.transcripts.slice(-maxTranscripts);
      }
      
      // Emit events
      this.emit('transcriptionComplete', { result, transcript });
      
      // Clear buffer if not in continuous mode
      if (!request.continuous) {
        this.audioBuffer = [];
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('Transcription failed', error);
      this.emit('transcriptionError', error);
      throw error;
    }
  }
  
  /**
   * Start continuous transcription
   */
  async startContinuousTranscription(
    service: 'whisper' | 'azure' | 'google',
    language?: string
  ): Promise<void> {
    this.continuousTranscription = true;
    this.audioBuffer = [];
    
    this.logger.info(`Started continuous transcription with ${service}`);
    this.emit('continuousTranscriptionStarted', { service, language });
  }
  
  /**
   * Stop continuous transcription
   */
  async stopContinuousTranscription(): Promise<void> {
    this.continuousTranscription = false;
    
    this.logger.info('Stopped continuous transcription');
    this.emit('continuousTranscriptionStopped');
  }
  
  /**
   * Add audio chunk for transcription
   */
  addAudioChunk(chunk: AudioChunk): void {
    this.audioBuffer.push(chunk);
    
    // Limit buffer size (keep last 30 seconds)
    const maxBufferDuration = 30000; // 30 seconds
    const totalDuration = this.audioBuffer.reduce((sum, c) => sum + c.duration, 0);
    
    if (totalDuration > maxBufferDuration) {
      let removeDuration = totalDuration - maxBufferDuration;
      while (removeDuration > 0 && this.audioBuffer.length > 0) {
        const removed = this.audioBuffer.shift()!;
        removeDuration -= removed.duration;
      }
    }
    
    this.emit('audioChunkAdded', chunk);
  }
  
  /**
   * Get recent transcripts
   */
  getRecentTranscripts(limit?: number): Transcript[] {
    const recentTranscripts = [...this.transcripts].reverse();
    return limit ? recentTranscripts.slice(0, limit) : recentTranscripts;
  }
  
  /**
   * Get available services
   */
  getAvailableServices(): string[] {
    return Array.from(this.services.keys()).filter(service => 
      this.services.get(service)?.isAvailable()
    );
  }
  
  /**
   * Get service status
   */
  getServiceStatus(): { [service: string]: boolean } {
    const status: { [service: string]: boolean } = {};
    
    for (const [name, service] of this.services) {
      status[name] = service.isAvailable();
    }
    
    return status;
  }
  
  /**
   * Generate unique transcript ID
   */
  private generateTranscriptId(): string {
    return `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up Speech Service Manager');
      
      this.continuousTranscription = false;
      this.audioBuffer = [];
      
      // Cleanup all services
      for (const [name, service] of this.services) {
        try {
          await service.cleanup();
          this.logger.info(`${name} service cleaned up`);
        } catch (error) {
          this.logger.error(`Error cleaning up ${name} service`, error);
        }
      }
      
      this.services.clear();
      this.transcripts = [];
      this.removeAllListeners();
      this.isInitialized = false;
      
      this.logger.info('Speech Service Manager cleanup completed');
      
    } catch (error) {
      this.logger.error('Error during Speech Service Manager cleanup', error);
      throw error;
    }
  }
}

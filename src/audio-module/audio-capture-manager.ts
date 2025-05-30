/**
 * Audio Capture Manager
 * 
 * Manages audio capture from Windows microphones using WASAPI through
 * Node.js FFI bindings to native C++ modules.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { ConfigManager } from '../utils/config-manager.js';
import { ErrorHandler, AudioMCPError } from '../utils/error-handler.js';

// Native module interface (will be implemented by C++ module)
interface NativeAudioModule {
  initialize(): boolean;
  startCapture(config: AudioCaptureConfig): boolean;
  stopCapture(): boolean;
  getDevices(): AudioDevice[];
  cleanup(): boolean;
  setAudioCallback(callback: (audioData: Buffer) => void): void;
}

export interface AudioCaptureConfig {
  deviceId: string;
  sampleRate: number;
  channels: number;
  bufferSizeMs: number;
}

export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isEnabled: boolean;
  channels: number;
  sampleRate: number;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Ring buffer for efficient audio data management
 */
class RingBuffer {
  private buffer: Float32Array;
  private writePos = 0;
  private readPos = 0;
  private size: number;
  
  constructor(sizeInSamples: number) {
    this.size = sizeInSamples;
    this.buffer = new Float32Array(sizeInSamples);
  }
  
  write(data: Float32Array): boolean {
    const availableSpace = this.getAvailableSpace();
    if (data.length > availableSpace) {
      return false; // Buffer overflow
    }
    
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writePos] = data[i];
      this.writePos = (this.writePos + 1) % this.size;
    }
    
    return true;
  }
  
  read(samples: number): Float32Array {
    const available = this.getAvailableData();
    const toRead = Math.min(samples, available);
    const result = new Float32Array(toRead);
    
    for (let i = 0; i < toRead; i++) {
      result[i] = this.buffer[this.readPos];
      this.readPos = (this.readPos + 1) % this.size;
    }
    
    return result;
  }
  
  getAvailableData(): number {
    return (this.writePos - this.readPos + this.size) % this.size;
  }
  
  getAvailableSpace(): number {
    return this.size - this.getAvailableData() - 1;
  }
  
  clear(): void {
    this.writePos = 0;
    this.readPos = 0;
  }
}

/**
 * Voice Activity Detection (simple energy-based)
 */
class VoiceActivityDetector {
  private energyThreshold: number;
  private silenceThreshold: number;
  private minSpeechDuration: number;
  private minSilenceDuration: number;
  private speechStartTime = 0;
  private silenceStartTime = 0;
  private isSpeaking = false;
  
  constructor(
    energyThreshold = 0.01,
    silenceThreshold = 0.005,
    minSpeechDuration = 300,
    minSilenceDuration = 500
  ) {
    this.energyThreshold = energyThreshold;
    this.silenceThreshold = silenceThreshold;
    this.minSpeechDuration = minSpeechDuration;
    this.minSilenceDuration = minSilenceDuration;
  }
  
  processAudio(audioData: Float32Array, timestamp: number): boolean {
    const energy = this.calculateEnergy(audioData);
    const now = timestamp;
    
    if (energy > this.energyThreshold) {
      if (!this.isSpeaking) {
        this.speechStartTime = now;
      }
      this.isSpeaking = true;
      this.silenceStartTime = 0;
    } else if (energy < this.silenceThreshold) {
      if (this.isSpeaking && this.silenceStartTime === 0) {
        this.silenceStartTime = now;
      }
      
      if (this.isSpeaking && 
          this.silenceStartTime > 0 && 
          (now - this.silenceStartTime) > this.minSilenceDuration) {
        this.isSpeaking = false;
        this.speechStartTime = 0;
        this.silenceStartTime = 0;
      }
    }
    
    return this.isSpeaking && (now - this.speechStartTime) > this.minSpeechDuration;
  }
  
  private calculateEnergy(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }
}

export class AudioCaptureManager extends EventEmitter {
  private logger: Logger;
  private config: ConfigManager;
  private nativeModule: NativeAudioModule | null = null;
  private ringBuffer: RingBuffer | null = null;
  private vad: VoiceActivityDetector;
  private isCapturing = false;
  private currentConfig: AudioCaptureConfig | null = null;
  private audioChunks: AudioChunk[] = [];
  private processingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    super();
    this.logger = Logger.getInstance();
    this.config = ConfigManager.getInstance();
    this.vad = new VoiceActivityDetector();
  }
  
  /**
   * Initialize the audio capture manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Audio Capture Manager');
      
      // Load native module
      this.nativeModule = this.loadNativeModule();
      
      if (!this.nativeModule.initialize()) {
        throw ErrorHandler.createCaptureError('Failed to initialize native audio module');
      }
      
      // Set up audio callback
      this.nativeModule.setAudioCallback((audioData: Buffer) => {
        this.onAudioData(audioData);
      });
      
      this.logger.info('Audio Capture Manager initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize Audio Capture Manager', error);
      throw error;
    }
  }
  
  /**
   * Start audio capture
   */
  async startCapture(config: AudioCaptureConfig): Promise<void> {
    if (this.isCapturing) {
      throw ErrorHandler.createCaptureError('Audio capture already in progress');
    }
    
    try {
      this.logger.info('Starting audio capture', config);
      
      if (!this.nativeModule) {
        throw ErrorHandler.createCaptureError('Native module not initialized');
      }
      
      // Create ring buffer based on configuration
      const bufferSizeInSamples = Math.ceil(
        (config.sampleRate * config.channels * 10) // 10 seconds buffer
      );
      this.ringBuffer = new RingBuffer(bufferSizeInSamples);
      
      // Start native capture
      if (!this.nativeModule.startCapture(config)) {
        throw ErrorHandler.createCaptureError('Failed to start native audio capture');
      }
      
      this.currentConfig = config;
      this.isCapturing = true;
      this.audioChunks = [];
      
      // Start processing audio chunks
      this.startAudioProcessing();
      
      this.emit('captureStarted', config);
      this.logger.info('Audio capture started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start audio capture', error);
      throw error;
    }
  }
  
  /**
   * Stop audio capture
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }
    
    try {
      this.logger.info('Stopping audio capture');
      
      if (this.nativeModule) {
        this.nativeModule.stopCapture();
      }
      
      this.isCapturing = false;
      this.currentConfig = null;
      
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }
      
      if (this.ringBuffer) {
        this.ringBuffer.clear();
        this.ringBuffer = null;
      }
      
      this.emit('captureStopped');
      this.logger.info('Audio capture stopped successfully');
      
    } catch (error) {
      this.logger.error('Failed to stop audio capture', error);
      throw error;
    }
  }
  
  /**
   * Get available audio devices
   */
  async getAudioDevices(): Promise<AudioDevice[]> {
    if (!this.nativeModule) {
      throw ErrorHandler.createDeviceError('Native module not initialized');
    }
    
    try {
      const devices = this.nativeModule.getDevices();
      this.logger.debug(`Found ${devices.length} audio devices`);
      return devices;
    } catch (error) {
      this.logger.error('Failed to get audio devices', error);
      throw ErrorHandler.createDeviceError('Failed to enumerate audio devices', error);
    }
  }
  
  /**
   * Get audio stream for real-time processing
   */
  async getAudioStream(): Promise<ReadableStream> {
    if (!this.isCapturing) {
      throw ErrorHandler.createCaptureError('No active audio capture');
    }
    
    return new ReadableStream({
      start: (controller) => {
        this.on('audioChunk', (chunk: AudioChunk) => {
          controller.enqueue(chunk);
        });
        
        this.on('captureStopped', () => {
          controller.close();
        });
      }
    });
  }
  
  /**
   * Get recent audio chunks
   */
  getRecentAudioChunks(durationSeconds = 10): AudioChunk[] {
    const cutoffTime = Date.now() - (durationSeconds * 1000);
    return this.audioChunks.filter(chunk => chunk.timestamp > cutoffTime);
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up Audio Capture Manager');
      
      await this.stopCapture();
      
      if (this.nativeModule) {
        this.nativeModule.cleanup();
        this.nativeModule = null;
      }
      
      this.removeAllListeners();
      this.logger.info('Audio Capture Manager cleanup completed');
      
    } catch (error) {
      this.logger.error('Error during Audio Capture Manager cleanup', error);
      throw error;
    }
  }
  
  /**
   * Load native audio module
   */
  private loadNativeModule(): NativeAudioModule {
    try {
      // This will be the actual native module once compiled
      // For now, return a mock implementation
      return require('../../build/Release/audio_capture.node');
    } catch (error) {
      this.logger.error('Failed to load native audio module', error);
      
      // Return a mock implementation for development
      return this.createMockNativeModule();
    }
  }
  
  /**
   * Create mock native module for development
   */
  private createMockNativeModule(): NativeAudioModule {
    this.logger.warn('Using mock native audio module for development');
    
    return {
      initialize: () => true,
      startCapture: () => true,
      stopCapture: () => true,
      getDevices: () => [{
        id: 'default',
        name: 'Default Microphone',
        isDefault: true,
        isEnabled: true,
        channels: 1,
        sampleRate: 44100
      }],
      cleanup: () => true,
      setAudioCallback: (callback) => {
        // Simulate audio data for testing
        setInterval(() => {
          if (this.isCapturing) {
            const mockAudio = Buffer.alloc(4096);
            callback(mockAudio);
          }
        }, 100);
      }
    };
  }
  
  /**
   * Handle incoming audio data from native module
   */
  private onAudioData(audioData: Buffer): void {
    if (!this.isCapturing || !this.ringBuffer || !this.currentConfig) {
      return;
    }
    
    try {
      // Convert buffer to Float32Array
      const floatData = new Float32Array(
        audioData.buffer,
        audioData.byteOffset,
        audioData.byteLength / 4
      );
      
      // Write to ring buffer
      if (!this.ringBuffer.write(floatData)) {
        this.logger.warn('Ring buffer overflow, dropping audio data');
        this.emit('bufferOverflow');
      }
      
    } catch (error) {
      this.logger.error('Error processing audio data', error);
    }
  }
  
  /**
   * Start audio chunk processing
   */
  private startAudioProcessing(): void {
    const chunkIntervalMs = 100; // Process chunks every 100ms
    
    this.processingInterval = setInterval(() => {
      this.processAudioChunks();
    }, chunkIntervalMs);
  }
  
  /**
   * Process audio chunks from ring buffer
   */
  private processAudioChunks(): void {
    if (!this.ringBuffer || !this.currentConfig) {
      return;
    }
    
    const samplesPerChunk = Math.floor(
      this.currentConfig.sampleRate * this.currentConfig.channels * 1.0 // 1 second chunks
    );
    
    const availableData = this.ringBuffer.getAvailableData();
    
    if (availableData >= samplesPerChunk) {
      const audioData = this.ringBuffer.read(samplesPerChunk);
      const timestamp = Date.now();
      
      // Apply voice activity detection
      const hasVoice = this.vad.processAudio(audioData, timestamp);
      
      if (hasVoice) {
        const chunk: AudioChunk = {
          data: audioData,
          timestamp,
          duration: 1000, // 1 second
          sampleRate: this.currentConfig.sampleRate,
          channels: this.currentConfig.channels
        };
        
        // Store chunk
        this.audioChunks.push(chunk);
        
        // Limit history
        const maxChunks = this.config.getServerConfig().transcriptionHistoryLimit;
        if (this.audioChunks.length > maxChunks) {
          this.audioChunks = this.audioChunks.slice(-maxChunks);
        }
        
        // Emit chunk for processing
        this.emit('audioChunk', chunk);
      }
    }
  }
}

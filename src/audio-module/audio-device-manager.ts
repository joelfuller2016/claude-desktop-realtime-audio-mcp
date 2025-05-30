/**
 * Audio Device Manager
 * 
 * Manages audio device enumeration, selection, and monitoring on Windows.
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/logger.js';
import { ErrorHandler, AudioMCPError } from '../utils/error-handler.js';
import { AudioDevice } from './audio-capture-manager.js';

export interface AudioDeviceProperties {
  friendlyName: string;
  description: string;
  state: 'active' | 'disabled' | 'notpresent' | 'unplugged';
  formatSupport: {
    minSampleRate: number;
    maxSampleRate: number;
    supportedChannels: number[];
    supportedFormats: string[];
  };
  endpoints: {
    input: boolean;
    output: boolean;
  };
}

export interface DetailedAudioDevice extends AudioDevice {
  properties?: AudioDeviceProperties;
}

/**
 * Device change monitoring
 */
interface DeviceChangeEvent {
  type: 'added' | 'removed' | 'defaultChanged' | 'stateChanged';
  device: AudioDevice;
  timestamp: number;
}

export class AudioDeviceManager extends EventEmitter {
  private logger: Logger;
  private devices: Map<string, DetailedAudioDevice> = new Map();
  private defaultDeviceId: string | null = null;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastDeviceSnapshot: string = '';
  
  constructor() {
    super();
    this.logger = Logger.getInstance();
  }
  
  /**
   * Initialize the device manager
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Audio Device Manager');
      
      // Load initial device list
      await this.refreshDeviceList();
      
      // Start monitoring for device changes
      this.startDeviceMonitoring();
      
      this.logger.info(`Audio Device Manager initialized with ${this.devices.size} devices`);
      
    } catch (error) {
      this.logger.error('Failed to initialize Audio Device Manager', error);
      throw error;
    }
  }
  
  /**
   * List all available audio devices
   */
  async listDevices(includeProperties = false): Promise<DetailedAudioDevice[]> {
    try {
      await this.refreshDeviceList();
      
      const deviceList = Array.from(this.devices.values());
      
      if (includeProperties) {
        // Fetch detailed properties for each device
        for (const device of deviceList) {
          if (!device.properties) {
            device.properties = await this.getDeviceProperties(device.id);
          }
        }
      }
      
      return deviceList;
      
    } catch (error) {
      this.logger.error('Failed to list audio devices', error);
      throw ErrorHandler.createDeviceError('Failed to list audio devices', error);
    }
  }
  
  /**
   * Get a specific device by ID
   */
  async getDevice(deviceId: string, includeProperties = false): Promise<DetailedAudioDevice | null> {
    try {
      await this.refreshDeviceList();
      
      const device = this.devices.get(deviceId);
      
      if (device && includeProperties && !device.properties) {
        device.properties = await this.getDeviceProperties(deviceId);
      }
      
      return device || null;
      
    } catch (error) {
      this.logger.error(`Failed to get device ${deviceId}`, error);
      throw ErrorHandler.createDeviceError(`Failed to get device ${deviceId}`, error);
    }
  }
  
  /**
   * Get the default audio input device
   */
  async getDefaultDevice(): Promise<DetailedAudioDevice | null> {
    try {
      await this.refreshDeviceList();
      
      if (this.defaultDeviceId) {
        return this.devices.get(this.defaultDeviceId) || null;
      }
      
      // Find first available device if no default set
      for (const device of this.devices.values()) {
        if (device.isEnabled) {
          return device;
        }
      }
      
      return null;
      
    } catch (error) {
      this.logger.error('Failed to get default device', error);
      throw ErrorHandler.createDeviceError('Failed to get default device', error);
    }
  }
  
  /**
   * Check if a device is available and accessible
   */
  async isDeviceAvailable(deviceId: string): Promise<boolean> {
    try {
      const device = await this.getDevice(deviceId);
      return device !== null && device.isEnabled;
    } catch (error) {
      this.logger.error(`Failed to check device availability for ${deviceId}`, error);
      return false;
    }
  }
  
  /**
   * Get device capabilities
   */
  async getDeviceCapabilities(deviceId: string): Promise<AudioDeviceProperties['formatSupport'] | null> {
    try {
      const device = await this.getDevice(deviceId, true);
      return device?.properties?.formatSupport || null;
    } catch (error) {
      this.logger.error(`Failed to get device capabilities for ${deviceId}`, error);
      return null;
    }
  }
  
  /**
   * Validate device configuration
   */
  async validateDeviceConfig(deviceId: string, sampleRate: number, channels: number): Promise<boolean> {
    try {
      const capabilities = await this.getDeviceCapabilities(deviceId);
      
      if (!capabilities) {
        return false;
      }
      
      const sampleRateSupported = 
        sampleRate >= capabilities.minSampleRate && 
        sampleRate <= capabilities.maxSampleRate;
        
      const channelsSupported = capabilities.supportedChannels.includes(channels);
      
      return sampleRateSupported && channelsSupported;
      
    } catch (error) {
      this.logger.error(`Failed to validate device config for ${deviceId}`, error);
      return false;
    }
  }
  
  /**
   * Start monitoring device changes
   */
  private startDeviceMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    
    // Poll for device changes every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkForDeviceChanges();
    }, 2000);
    
    this.logger.info('Started device monitoring');
  }
  
  /**
   * Stop monitoring device changes
   */
  private stopDeviceMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.logger.info('Stopped device monitoring');
  }
  
  /**
   * Check for device changes
   */
  private async checkForDeviceChanges(): Promise<void> {
    try {
      const currentDevices = await this.getNativeDeviceList();
      const currentSnapshot = JSON.stringify(currentDevices.sort((a, b) => a.id.localeCompare(b.id)));
      
      if (currentSnapshot !== this.lastDeviceSnapshot) {
        this.logger.info('Device changes detected');
        
        const oldDevices = new Map(this.devices);
        await this.refreshDeviceList();
        
        // Detect specific changes
        this.detectDeviceChanges(oldDevices, this.devices);
        
        this.lastDeviceSnapshot = currentSnapshot;
      }
      
    } catch (error) {
      this.logger.error('Error checking for device changes', error);
    }
  }
  
  /**
   * Detect and emit specific device change events
   */
  private detectDeviceChanges(
    oldDevices: Map<string, DetailedAudioDevice>,
    newDevices: Map<string, DetailedAudioDevice>
  ): void {
    const now = Date.now();
    
    // Check for added devices
    for (const [id, device] of newDevices) {
      if (!oldDevices.has(id)) {
        const event: DeviceChangeEvent = {
          type: 'added',
          device,
          timestamp: now
        };
        this.emit('deviceAdded', event);
        this.logger.info(`Audio device added: ${device.name}`);
      }
    }
    
    // Check for removed devices
    for (const [id, device] of oldDevices) {
      if (!newDevices.has(id)) {
        const event: DeviceChangeEvent = {
          type: 'removed',
          device,
          timestamp: now
        };
        this.emit('deviceRemoved', event);
        this.logger.info(`Audio device removed: ${device.name}`);
      }
    }
    
    // Check for default device changes
    const oldDefault = Array.from(oldDevices.values()).find(d => d.isDefault);
    const newDefault = Array.from(newDevices.values()).find(d => d.isDefault);
    
    if (oldDefault?.id !== newDefault?.id) {
      if (newDefault) {
        const event: DeviceChangeEvent = {
          type: 'defaultChanged',
          device: newDefault,
          timestamp: now
        };
        this.emit('defaultDeviceChanged', event);
        this.logger.info(`Default audio device changed to: ${newDefault.name}`);
      }
    }
    
    // Check for state changes
    for (const [id, newDevice] of newDevices) {
      const oldDevice = oldDevices.get(id);
      if (oldDevice && oldDevice.isEnabled !== newDevice.isEnabled) {
        const event: DeviceChangeEvent = {
          type: 'stateChanged',
          device: newDevice,
          timestamp: now
        };
        this.emit('deviceStateChanged', event);
        this.logger.info(`Audio device state changed: ${newDevice.name} - ${newDevice.isEnabled ? 'enabled' : 'disabled'}`);
      }
    }
  }
  
  /**
   * Refresh the internal device list
   */
  private async refreshDeviceList(): Promise<void> {
    try {
      const nativeDevices = await this.getNativeDeviceList();
      
      this.devices.clear();
      this.defaultDeviceId = null;
      
      for (const device of nativeDevices) {
        this.devices.set(device.id, device);
        
        if (device.isDefault) {
          this.defaultDeviceId = device.id;
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to refresh device list', error);
      throw error;
    }
  }
  
  /**
   * Get device list from native module
   */
  private async getNativeDeviceList(): Promise<DetailedAudioDevice[]> {
    try {
      // This would call the native module
      // For now, return mock data
      return this.getMockDeviceList();
      
    } catch (error) {
      this.logger.error('Failed to get native device list', error);
      throw error;
    }
  }
  
  /**
   * Get detailed properties for a device
   */
  private async getDeviceProperties(deviceId: string): Promise<AudioDeviceProperties> {
    try {
      // This would call the native module for detailed properties
      // For now, return mock properties
      return {
        friendlyName: `Audio Device ${deviceId}`,
        description: 'High Definition Audio Device',
        state: 'active',
        formatSupport: {
          minSampleRate: 8000,
          maxSampleRate: 96000,
          supportedChannels: [1, 2],
          supportedFormats: ['PCM16', 'PCM24', 'PCM32', 'Float32']
        },
        endpoints: {
          input: true,
          output: false
        }
      };
      
    } catch (error) {
      this.logger.error(`Failed to get device properties for ${deviceId}`, error);
      throw error;
    }
  }
  
  /**
   * Get mock device list for development
   */
  private getMockDeviceList(): DetailedAudioDevice[] {
    return [
      {
        id: 'default',
        name: 'Default Microphone',
        isDefault: true,
        isEnabled: true,
        channels: 1,
        sampleRate: 44100
      },
      {
        id: 'microphone-1',
        name: 'USB Microphone',
        isDefault: false,
        isEnabled: true,
        channels: 1,
        sampleRate: 48000
      },
      {
        id: 'microphone-2',
        name: 'Built-in Microphone',
        isDefault: false,
        isEnabled: true,
        channels: 2,
        sampleRate: 44100
      }
    ];
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up Audio Device Manager');
      
      this.stopDeviceMonitoring();
      this.devices.clear();
      this.removeAllListeners();
      
      this.logger.info('Audio Device Manager cleanup completed');
      
    } catch (error) {
      this.logger.error('Error during Audio Device Manager cleanup', error);
      throw error;
    }
  }
}

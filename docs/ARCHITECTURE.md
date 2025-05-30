# Technical Architecture Document

## Overview

The Claude Desktop Real-time Audio MCP is designed as a multi-layered system that bridges Windows audio capture with Claude Desktop through the Model Context Protocol. This document outlines the technical architecture, component interactions, and implementation strategies.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Desktop                          │
│                    (MCP Client)                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │ JSON-RPC over stdio
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server                                 │
│                   (TypeScript)                                │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Tool Handlers  │   Resources       │   Configuration          │
│  - startCapture │   - deviceList    │   - audioSettings        │
│  - stopCapture  │   - audioStream   │   - speechSettings       │
│  - transcribe   │   - transcripts   │   - serviceKeys          │
└─────────────────┼───────────────────┼───────────────────────────┘
                  │                   │
                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Audio Processing Layer                        │
│                    (Node.js FFI)                              │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Buffer Manager │   Format Convert  │   Device Manager          │
│  - ringBuffer   │   - sampleRate    │   - enumeration           │
│  - chunking     │   - channelMix    │   - selection             │
│  - vad          │   - bitDepth      │   - monitoring            │
└─────────────────┼───────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Native Audio Module                           │
│                      (C++ WASAPI)                             │
├─────────────────┬───────────────────┬───────────────────────────┤
│  WASAPI Client  │   Audio Capture   │   Error Handling          │
│  - initialize   │   - streaming     │   - deviceLost            │
│  - configure    │   - callbacks     │   - formatChange          │
│  - cleanup      │   - lowLatency    │   - recovery              │
└─────────────────┼───────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Windows Audio System                          │
│                       (WASAPI)                                │
└─────────────────────────────────────────────────────────────────┘
```

### Speech Recognition Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                  Speech Recognition Layer                       │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Local Whisper  │   Azure Speech    │   Google Speech           │
│  - offline      │   - streaming     │   - streaming             │
│  - low latency  │   - multilingual  │   - high accuracy         │
│  - private      │   - cloud         │   - cloud                 │
└─────────────────┼───────────────────┼───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Transcription Pipeline                        │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Chunking       │   Processing      │   Output                  │
│  - VAD          │   - noise reduce  │   - formatting            │
│  - silence      │   - normalize     │   - timestamps            │
│  - overlap      │   - enhance       │   - confidence            │
└─────────────────┴───────────────────┴───────────────────────────┘
```

## Component Design

### 1. MCP Server (TypeScript)

**Responsibilities:**
- Implement MCP protocol communication
- Manage audio capture lifecycle
- Coordinate speech recognition services
- Handle configuration and state management

**Key Classes:**
```typescript
class AudioMCPServer extends McpServer {
  private audioCapture: AudioCaptureManager;
  private speechServices: SpeechServiceManager;
  private deviceManager: AudioDeviceManager;
  
  // MCP Tools
  async startAudioCapture(deviceId?: string): Promise<void>
  async stopAudioCapture(): Promise<void>
  async transcribeAudio(audioData: Buffer, service: string): Promise<string>
  async listAudioDevices(): Promise<AudioDevice[]>
  
  // MCP Resources
  async getAudioStream(): Promise<ReadableStream>
  async getTranscriptionHistory(): Promise<Transcript[]>
  async getDeviceConfiguration(): Promise<DeviceConfig>
}
```

### 2. Audio Processing Layer (Node.js)

**Responsibilities:**
- Bridge between TypeScript and native C++
- Manage audio buffering and streaming
- Handle format conversions
- Implement voice activity detection

**Key Components:**
```typescript
class AudioCaptureManager {
  private nativeModule: NativeAudioModule;
  private bufferManager: RingBufferManager;
  private vadProcessor: VoiceActivityDetector;
  
  async initialize(config: AudioConfig): Promise<void>
  async startCapture(deviceId: string): Promise<ReadableStream>
  async stopCapture(): Promise<void>
  onAudioData(callback: (chunk: AudioChunk) => void): void
}

class RingBufferManager {
  private buffer: CircularBuffer;
  private chunkSize: number;
  private overlapRatio: number;
  
  write(data: Float32Array): void
  read(size: number): Float32Array
  getChunks(duration: number): AudioChunk[]
}
```

### 3. Native Audio Module (C++)

**Responsibilities:**
- Direct WASAPI integration
- Low-latency audio capture
- Device enumeration and management
- Error handling and recovery

**Key Classes:**
```cpp
class WASAPIAudioCapture {
public:
    struct AudioConfig {
        uint32_t sampleRate = 44100;
        uint32_t channels = 1;
        uint32_t bitsPerSample = 16;
        uint32_t bufferSizeMs = 10;
    };
    
    bool Initialize(const std::string& deviceId, const AudioConfig& config);
    bool StartCapture(std::function<void(const float*, size_t)> callback);
    bool StopCapture();
    std::vector<AudioDevice> EnumerateDevices();
    void Cleanup();

private:
    Microsoft::WRL::ComPtr<IAudioClient> audioClient_;
    Microsoft::WRL::ComPtr<IAudioCaptureClient> captureClient_;
    std::unique_ptr<std::thread> captureThread_;
    std::atomic<bool> isCapturing_;
};

class AudioDeviceEnumerator {
public:
    std::vector<AudioDevice> GetCaptureDevices();
    AudioDevice GetDefaultDevice();
    bool IsDeviceValid(const std::string& deviceId);
};
```

## Data Flow

### Audio Capture Flow

1. **Initialization**
   ```
   Claude Desktop → MCP Server → Audio Manager → Native Module → WASAPI
   ```

2. **Real-time Capture**
   ```
   Microphone → WASAPI → Native Module → Ring Buffer → Chunking → MCP Server
   ```

3. **Speech Recognition**
   ```
   Audio Chunks → Voice Activity Detection → Format Conversion → Speech Service → Text
   ```

4. **Result Delivery**
   ```
   Transcribed Text → MCP Server → Claude Desktop → User Interface
   ```

### Message Flow (MCP Protocol)

```json
// Start Audio Capture
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "startAudioCapture",
    "arguments": {
      "deviceId": "default",
      "sampleRate": 44100,
      "channels": 1
    }
  },
  "id": "1"
}

// Audio Data Notification
{
  "jsonrpc": "2.0",
  "method": "notifications/message",
  "params": {
    "level": "info",
    "data": {
      "type": "audioData",
      "timestamp": "2025-05-30T20:59:00Z",
      "duration": 1000,
      "transcription": "Hello Claude, can you hear me?"
    }
  }
}
```

## Performance Considerations

### Latency Optimization

1. **Audio Path Latency**
   - WASAPI buffer: 10-20ms
   - Processing overhead: <5ms
   - Network (cloud STT): 50-200ms
   - Total target: <250ms for local, <500ms for cloud

2. **Memory Management**
   - Ring buffer size: 10-30 seconds
   - Chunk size: 1-3 seconds
   - Overlap: 0.5-1 second
   - Memory limit: <100MB total

3. **CPU Optimization**
   - Dedicated audio thread
   - Lock-free data structures
   - SIMD optimizations for DSP
   - Efficient format conversions

### Error Handling Strategy

1. **Device Failures**
   - Automatic device reconnection
   - Fallback to default device
   - Graceful degradation

2. **Network Issues**
   - Retry with exponential backoff
   - Fallback to local processing
   - Queue management

3. **Resource Exhaustion**
   - Memory pressure monitoring
   - Buffer overflow protection
   - Graceful shutdown

## Security Considerations

### Audio Data Protection

1. **Local Processing**
   - Audio data never leaves the machine (Whisper)
   - In-memory processing only
   - Secure buffer cleanup

2. **Cloud Integration**
   - Encrypted transmission (TLS 1.3)
   - Temporary processing only
   - No data retention

3. **Permissions**
   - Windows microphone permissions
   - User consent for cloud services
   - Audit logging

### Configuration Security

1. **API Keys**
   - Environment variables
   - Windows Credential Manager
   - Encrypted storage

2. **Device Access**
   - Principle of least privilege
   - Device-specific permissions
   - Access logging

## Integration Points

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "realtime-audio": {
      "command": "node",
      "args": [
        "C:\\path\\to\\claude-desktop-realtime-audio-mcp\\build\\index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "AZURE_SPEECH_KEY": "...",
        "GOOGLE_CLOUD_CREDENTIALS": "..."
      }
    }
  }
}
```

### Speech Service Integration

1. **OpenAI Whisper (Local)**
   ```typescript
   import whisper from 'whisper-node';
   
   const transcript = await whisper.transcribe(audioBuffer, {
     model: 'base.en',
     language: 'en'
   });
   ```

2. **Azure Speech Services**
   ```typescript
   import { SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';
   
   const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
   recognizer.recognizeOnceAsync(result => {
     // Handle transcription result
   });
   ```

3. **Google Speech-to-Text**
   ```typescript
   import speech from '@google-cloud/speech';
   
   const request = {
     audio: { content: audioBase64 },
     config: {
       encoding: 'LINEAR16',
       sampleRateHertz: 44100,
       languageCode: 'en-US'
     }
   };
   
   const [response] = await client.recognize(request);
   ```

## Future Enhancements

### Phase 2 Features
- Multi-language support
- Speaker diarization
- Noise cancellation
- Audio preprocessing

### Phase 3 Features
- Custom wake words
- Continuous conversation mode
- Audio compression
- Performance analytics

### Scalability Considerations
- Multiple concurrent sessions
- Resource pooling
- Horizontal scaling
- Load balancing

---

This architecture provides a solid foundation for real-time audio integration while maintaining flexibility for future enhancements and optimizations.
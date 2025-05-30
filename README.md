# Claude Desktop Real-time Audio MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![Windows](https://img.shields.io/badge/Platform-Windows-blue)](https://www.microsoft.com/windows)

A Model Context Protocol (MCP) server that enables **real-time microphone input** for Claude Desktop on Windows. This project bridges the gap between Claude's conversational AI and live voice input through Windows Audio Session API (WASAPI) integration and real-time speech recognition.

## 🚀 Features

- **Real-time Audio Capture**: Low-latency microphone input using Windows WASAPI
- **Multiple Speech-to-Text Engines**: Support for OpenAI Whisper, Azure Speech, and Google Speech
- **MCP Integration**: Seamless integration with Claude Desktop through the Model Context Protocol
- **Voice Activity Detection**: Intelligent silence detection and audio chunking
- **Device Management**: Automatic audio device enumeration and selection
- **Cross-format Support**: Support for multiple audio formats and sample rates
- **Performance Optimized**: Minimal latency for natural conversation flow

## 🏗️ Project Status

**🚧 Under Active Development**

This project is currently in the research and development phase. See the [Project Roadmap](#🗺️-project-roadmap) below for detailed milestones and progress tracking.

## 🎯 Vision

Enable natural, voice-driven conversations with Claude Desktop by providing:
- Sub-500ms latency from speech to text
- Robust error handling and graceful degradation
- Easy installation and configuration
- Support for multiple audio input sources
- Extensible architecture for future enhancements

## 🗺️ Project Roadmap

### Phase 1: Research & Architecture (Target: June 15, 2025)
- [x] Research Windows WASAPI APIs and real-time audio capture methods
- [x] Design MCP server architecture for audio streaming
- [ ] Create proof-of-concept WASAPI audio capture in C++
- [ ] Evaluate speech-to-text integration options
- [ ] Set up development environment and toolchain

### Phase 2: Core Audio Implementation (Target: July 1, 2025)
- [ ] Implement WASAPI audio capture module in C++
- [ ] Create Node.js FFI bindings for audio module
- [ ] Develop real-time audio buffering and streaming system
- [ ] Implement audio format conversion and processing pipeline
- [ ] Create device enumeration and selection functionality

### Phase 3: MCP Server Development (Target: July 20, 2025)
- [ ] Implement MCP server using TypeScript SDK
- [ ] Create audio capture tools for MCP interface
- [ ] Implement speech-to-text integration tools
- [ ] Develop configuration and device management resources
- [ ] Add error handling and graceful shutdown mechanisms

### Phase 4: Speech Recognition Integration (Target: August 10, 2025)
- [ ] Integrate OpenAI Whisper for local processing
- [ ] Add Azure Speech Services integration
- [ ] Implement Google Speech-to-Text support
- [ ] Develop real-time transcription with chunking strategies
- [ ] Create voice activity detection and silence handling

### Phase 5: Claude Desktop Integration (Target: August 25, 2025)
- [ ] Test integration with Claude Desktop configuration
- [ ] Optimize latency and performance for real-time use
- [ ] Implement user preferences and configuration UI
- [ ] Create installation and setup automation
- [ ] Develop usage examples and demo scenarios

### Phase 6: Testing & Documentation (Target: September 15, 2025)
- [ ] Create comprehensive test suite for all components
- [ ] Write detailed installation and usage documentation
- [ ] Develop troubleshooting guides and FAQ
- [ ] Perform security and performance audits
- [ ] Prepare release packages and distribution

## 🏛️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Claude        │    │  MCP Server      │    │  Audio Module   │
│   Desktop       │◄──►│  (TypeScript)    │◄──►│  (C++ WASAPI)   │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                        ┌──────────────────┐    ┌─────────────────┐
                        │  Speech-to-Text  │    │  Windows Audio  │
                        │  Services        │    │  System         │
                        │  (Whisper/Azure/ │    │  (Microphone)   │
                        │   Google)        │    │                 │
                        └──────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Core MCP Server**: TypeScript with [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- **Audio Capture**: C++ with Windows WASAPI
- **Node.js Integration**: node-gyp for native module compilation
- **Speech Recognition**: 
  - OpenAI Whisper (local processing)
  - Azure Speech Services (cloud)
  - Google Speech-to-Text (cloud)
- **Build System**: node-gyp, TypeScript compiler
- **Documentation**: Markdown with GitHub Pages

## 📋 Prerequisites

- **Windows 10/11** (Windows 7+ with WASAPI support)
- **Node.js 16+** with npm
- **Visual Studio Build Tools** (for native compilation)
- **Python 3.8+** (for node-gyp)
- **Git** for version control

## 🚦 Quick Start

> **Note**: This project is under development. Installation instructions will be available with the first release.

```bash
# Clone the repository
git clone https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp.git
cd claude-desktop-realtime-audio-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Configure Claude Desktop
# (Instructions will be provided in setup documentation)
```

## 🤝 Contributing

We welcome contributions of all kinds! Whether you want to:

- 🐛 Report bugs or issues
- 💡 Suggest new features or improvements
- 🔧 Submit code contributions
- 📚 Improve documentation
- 🧪 Help with testing

Please see our [Contributing Guide](CONTRIBUTING.md) for detailed information on how to get started.

## 📖 Research & References

This project builds upon extensive research in:

- **MCP Protocol**: [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- **Windows Audio**: [WASAPI Documentation](https://learn.microsoft.com/en-us/windows/win32/coreaudio/wasapi)
- **Speech Recognition**: Real-time speech processing and chunking strategies
- **Node.js Native Modules**: FFI and node-gyp integration patterns

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude and the Model Context Protocol
- [OpenAI](https://openai.com/) for Whisper speech recognition
- The Node.js and TypeScript communities for excellent tooling
- Microsoft for comprehensive WASAPI documentation and examples

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/discussions)
- **Documentation**: [Wiki](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/wiki)

---

**⭐ Star this repository if you find it interesting or useful!**

*This project aims to make voice-driven AI conversations more natural and accessible. Join us in building the future of human-AI interaction.*
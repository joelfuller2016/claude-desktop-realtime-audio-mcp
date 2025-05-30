# Contributing to Claude Desktop Real-time Audio MCP

Thank you for your interest in contributing to this project! We welcome contributions of all kinds and appreciate your help in making real-time voice interaction with Claude Desktop a reality.

## 🚀 Ways to Contribute

### 🐛 Reporting Bugs
- Use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- Search existing issues before creating a new one
- Include detailed information about your environment and steps to reproduce

### 💡 Suggesting Enhancements
- Use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)
- Describe the problem you're trying to solve
- Explain why this enhancement would be useful

### 🔧 Code Contributions
- Fork the repository and create a feature branch
- Follow our coding standards and guidelines
- Write tests for new functionality
- Submit a pull request with a clear description

### 📚 Documentation
- Improve README, code comments, or wiki pages
- Create tutorials or usage examples
- Help with API documentation

### 🧪 Testing
- Test on different Windows versions and hardware configurations
- Report compatibility issues
- Help with performance testing and optimization

## 🛠️ Development Setup

### Prerequisites
1. **Windows 10/11** with WASAPI support
2. **Node.js 16+** with npm
3. **Visual Studio Build Tools 2019 or later**
4. **Python 3.8+** (for node-gyp)
5. **Git** for version control

### Environment Setup

1. **Install Visual Studio Build Tools**
   ```bash
   # Download and install Visual Studio Build Tools
   # Ensure you select "C++ build tools" workload
   # Include Windows 10/11 SDK
   ```

2. **Install Node.js and Dependencies**
   ```bash
   # Install Node.js LTS from nodejs.org
   npm install -g node-gyp
   npm install -g typescript
   ```

3. **Clone and Setup Project**
   ```bash
   git clone https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp.git
   cd claude-desktop-realtime-audio-mcp
   npm install
   ```

4. **Build the Project**
   ```bash
   npm run build
   ```

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the coding standards below
   - Write tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Use the PR template
   - Link any related issues
   - Request review from maintainers

## 📝 Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer async/await over callbacks

### C++ (Native Modules)
- Follow Google C++ Style Guide
- Use RAII for resource management
- Handle all error conditions
- Add comprehensive comments
- Use modern C++17 features

### Git Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
type(scope): brief description

Detailed explanation if needed

Closes #issue-number
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Review Guidelines
- Be respectful and constructive
- Focus on code quality and maintainability
- Test thoroughly before approving
- Suggest improvements when possible

## 📊 Project Structure

```
├── src/
│   ├── mcp-server/          # MCP server implementation
│   ├── audio-module/        # C++ WASAPI module
│   ├── speech-recognition/  # Speech-to-text integrations
│   └── utils/              # Shared utilities
├── tests/
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data
├── docs/
│   ├── api/                # API documentation
│   ├── guides/             # User guides
│   └── development/        # Development docs
├── scripts/                # Build and deployment scripts
├── examples/               # Usage examples
└── tools/                  # Development tools
```

## 🧪 Testing Guidelines

### Unit Tests
- Write tests for all public APIs
- Use Jest for TypeScript/JavaScript
- Use Google Test for C++ components
- Aim for >80% code coverage

### Integration Tests
- Test MCP server with real audio input
- Test speech recognition integrations
- Test Claude Desktop integration

### Performance Tests
- Measure audio capture latency
- Test with different audio configurations
- Monitor memory usage and leaks

## 📋 Pull Request Process

1. **Pre-submission Checklist**
   - [ ] Code follows style guidelines
   - [ ] Tests pass locally
   - [ ] Documentation updated
   - [ ] No merge conflicts

2. **Review Process**
   - Maintainer reviews code and tests
   - Address feedback promptly
   - Update PR as needed
   - Final approval and merge

3. **Post-merge**
   - Monitor for any issues
   - Update documentation if needed
   - Close related issues

## 🔒 Security Guidelines

- Never commit API keys or secrets
- Use environment variables for configuration
- Validate all user inputs
- Follow secure coding practices
- Report security issues privately

## 📞 Getting Help

- **Questions**: [GitHub Discussions](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/discussions)
- **Issues**: [GitHub Issues](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/issues)
- **Documentation**: [Project Wiki](https://github.com/joelfuller2016/claude-desktop-realtime-audio-mcp/wiki)

## 📜 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- Special recognition for major features

---

**Thank you for contributing to making voice-driven AI conversations more accessible and natural!**
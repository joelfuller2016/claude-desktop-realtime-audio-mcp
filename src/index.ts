#!/usr/bin/env node

/**
 * Claude Desktop Real-time Audio MCP Server
 * 
 * This is the main entry point for the MCP server that provides real-time
 * microphone input capabilities for Claude Desktop on Windows.
 * 
 * @author Joel Fuller
 * @license MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { AudioMCPServer } from './mcp-server/audio-mcp-server.js';
import { Logger } from './utils/logger.js';
import { ConfigManager } from './utils/config-manager.js';
import { ErrorHandler } from './utils/error-handler.js';

/**
 * Main server initialization and startup
 */
async function main(): Promise<void> {
  const logger = Logger.getInstance();
  const config = ConfigManager.getInstance();
  
  try {
    logger.info('Starting Claude Desktop Real-time Audio MCP Server');
    
    // Load configuration
    await config.load();
    
    // Create MCP server instance
    const server = new Server(
      {
        name: 'claude-desktop-realtime-audio-mcp',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );
    
    // Create audio MCP server
    const audioServer = new AudioMCPServer(server);
    
    // Initialize audio server
    await audioServer.initialize();
    
    // Set up transport
    const transport = new StdioServerTransport();
    
    // Start server
    await server.connect(transport);
    
    logger.info('MCP Server started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await audioServer.cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await audioServer.cleanup();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    ErrorHandler.handleCriticalError(error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  Logger.getInstance().error('Uncaught exception', error);
  ErrorHandler.handleCriticalError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.getInstance().error('Unhandled rejection at:', promise, 'reason:', reason);
  ErrorHandler.handleCriticalError(reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  main().catch((error) => {
    Logger.getInstance().error('Failed to start server', error);
    process.exit(1);
  });
}

export { main };

#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { SafeAgent } from '../agents/safe-agent.js';
import { logger } from '../util/log.js';

async function demoChatInterface(): Promise<void> {
  logger.info('🤖 Chat Agent CLI - Natural Language Interface Demo');
  logger.info('=' .repeat(60));
  logger.info('💬 This demonstrates how you can chat naturally with your AI coding assistant!');
  logger.info('   In the real CLI, you would type these messages and get responses.');
  
  try {
    // Initialize agent
    const agent = new SafeAgent();
    await agent.initialize();
    
    // Show current context
    const status = await agent.getRepoStatus();
    logger.info('\n📊 Current Context:');
    logger.info(`   Repository: ${status.remoteUrl ? status.remoteUrl.split('/').pop() : 'Local'}`);
    logger.info(`   Branch: ${status.currentBranch}`);
    logger.info(`   Status: ${status.isClean ? '✅ Clean' : '⚠️ Modified'}`);
    logger.info(`   Last Commit: ${status.lastCommit}`);
    
    // Demo conversation
    await simulateConversation(agent);
    
  } catch (error) {
    logger.error(`❌ Demo failed: ${error}`);
  }
}

async function simulateConversation(agent: SafeAgent): Promise<void> {
  const conversations = [
    {
      user: "hello",
      response: "Hello! I'm your AI coding assistant. I can help you with:\n" +
               "• Analyzing code and suggesting improvements\n" +
               "• Reviewing functions and adding error handling\n" +
               "• Refactoring and optimizing code\n" +
               "• Setting up new features and components\n\n" +
               "What would you like to work on today?"
    },
    {
      user: "what can you do?",
      response: "I'm a Safe Agent that can:\n" +
               "• Read and analyze your project files\n" +
               "• Suggest code improvements and best practices\n" +
               "• Help with refactoring and optimization\n" +
               "• Provide implementation guidance\n" +
               "• Work safely on development branches only\n\n" +
               "Try asking me something like: \"Can you help me add error handling to the login function?\""
    },
    {
      user: "help me add error handling to the login function",
      response: "🚀 Executing task with Safe Agent...\n\n" +
               "I'll analyze your codebase to find the login function and suggest improvements for error handling."
    }
  ];
  
  for (const conv of conversations) {
    logger.info(`\n💬 You: ${conv.user}`);
    logger.info('🤔 AI Agent is thinking...');
    
    if (conv.user.includes('help') || conv.user.includes('add') || conv.user.includes('error')) {
      // This is a task request - execute it
      try {
        const task = {
          id: `demo-task-${Date.now()}`,
          description: conv.user,
          files: []
        };
        
        const result = await agent.executeTask(task);
        
        if (result.success) {
          logger.success('\n✅ Task completed successfully!');
          logger.info('\n📋 Results:');
          logger.info('=' .repeat(50));
          console.log(result.output);
          logger.info('=' .repeat(50));
          
          if (result.filesRead && result.filesRead.length > 0) {
            logger.info(`\n📁 Files analyzed: ${result.filesRead.join(', ')}`);
          }
        } else {
          logger.error(`❌ Task failed: ${result.error}`);
        }
        
      } catch (error) {
        logger.error(`❌ Task execution failed: ${error}`);
      }
    } else {
      // This is a chat response
      logger.info('\n🤖 AI Agent:');
      console.log(conv.response);
    }
    
    // Small delay to simulate real conversation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Show available commands
  logger.info('\n📚 Available Commands:');
  logger.info('   help, ?          - Show help message');
  logger.info('   context, status  - Show current repository context');
  logger.info('   history          - Show conversation history');
  logger.info('   clear, reset     - Clear conversation history');
  logger.info('   exit, quit, bye  - Exit the chat');
  
  logger.info('\n💬 Natural Language Examples:');
  logger.info('   "Can you help me add error handling to the login function?"');
  logger.info('   "Review this code for security issues"');
  logger.info('   "Suggest ways to optimize the database queries"');
  logger.info('   "Help me refactor this component"');
  logger.info('   "What do you think about this architecture?"');
  
  logger.info('\n🔒 Safety Features:');
  logger.info('   • Only works on development branches');
  logger.info('   • Never modifies protected branches');
  logger.info('   • Read-only file analysis');
  logger.info('   • Safe development practices');
  
  logger.info('\n🎯 To use the interactive chat:');
  logger.info('   npm run chat');
  logger.info('\n🚀 To test the multi-agent system:');
  logger.info('   npm run test:multi-agent');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demoChatInterface().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

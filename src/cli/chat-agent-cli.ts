#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import { SafeAgent } from '../agents/safe-agent.js';
import { logger } from '../util/log.js';

class ChatAgentCLI {
  private agent?: SafeAgent;
  private rl: readline.Interface;
  private conversationHistory: string[] = [];

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('🤖 Chat Agent CLI - Natural Language Interface');
      logger.info('=' .repeat(50));
      logger.info('💬 Chat naturally with your AI coding assistant!');
      logger.info('   Type "help" for commands, "exit" to quit');
      logger.info('   Example: "Can you help me add error handling to the login function?"');
      
      // Initialize agent
      this.agent = new SafeAgent();
      await this.agent.initialize();
      
      // Show current context
      await this.showContext();
      
      // Start chat loop
      await this.chatLoop();
      
    } catch (error) {
      logger.error(`❌ Chat CLI failed: ${error}`);
      process.exit(1);
    }
  }

  private async showContext(): Promise<void> {
    try {
      if (!this.agent) return;
      
      const status = await this.agent.getRepoStatus();
      
      logger.info('\n📊 Current Context:');
      logger.info(`   Repository: ${status.remoteUrl ? status.remoteUrl.split('/').pop() : 'Local'}`);
      logger.info(`   Branch: ${status.currentBranch}`);
      logger.info(`   Status: ${status.isClean ? '✅ Clean' : '⚠️ Modified'}`);
      logger.info(`   Last Commit: ${status.lastCommit}`);
      
    } catch (error) {
      logger.warn(`Could not get context: ${error}`);
    }
  }

  private async chatLoop(): Promise<void> {
    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question('\n💬 You: ', resolve);
      });
    };

    while (true) {
      try {
        const input = await askQuestion();
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit' || trimmed === 'bye') {
          logger.info('👋 Goodbye! Happy coding!');
          break;
        }
        
        if (trimmed === 'help' || trimmed === '?') {
          this.showHelp();
          continue;
        }
        
        if (trimmed === 'context' || trimmed === 'status') {
          await this.showContext();
          continue;
        }
        
        if (trimmed === 'clear' || trimmed === 'reset') {
          this.conversationHistory = [];
          logger.info('🧹 Conversation history cleared');
          continue;
        }
        
        if (trimmed === 'history') {
          this.showHistory();
          continue;
        }
        
        if (trimmed === '') {
          continue;
        }
        
        // Process the user's message
        await this.processUserMessage(trimmed);
        
      } catch (error) {
        logger.error(`❌ Chat error: ${error}`);
      }
    }
    
    this.rl.close();
  }

  private async processUserMessage(message: string): Promise<void> {
    try {
      // Add to conversation history
      this.conversationHistory.push(`User: ${message}`);
      
      // Show thinking indicator
      logger.info('🤔 AI Agent is thinking...');
      
      // Determine if this is a task request
      const isTaskRequest = this.isTaskRequest(message);
      
      if (isTaskRequest) {
        await this.executeTask(message);
      } else {
        await this.chatResponse(message);
      }
      
    } catch (error) {
      logger.error(`❌ Failed to process message: ${error}`);
    }
  }

  private isTaskRequest(message: string): boolean {
    const taskKeywords = [
      'analyze', 'review', 'help', 'fix', 'improve', 'add', 'implement',
      'refactor', 'optimize', 'debug', 'test', 'create', 'build', 'design'
    ];
    
    const lowerMessage = message.toLowerCase();
    return taskKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private async executeTask(taskDescription: string): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      logger.info('🚀 Executing task with Safe Agent...');
      
      const task = {
        id: `chat-task-${Date.now()}`,
        description: taskDescription,
        files: []
      };
      
      const result = await this.agent.executeTask(task);
      
      if (result.success) {
        logger.success('\n✅ Task completed successfully!');
        
        // Add AI response to history
        const aiResponse = `AI Agent: Task completed successfully!\n\n${result.output}`;
        this.conversationHistory.push(aiResponse);
        
        // Display results
        logger.info('\n📋 Results:');
        logger.info('=' .repeat(50));
        console.log(result.output);
        logger.info('=' .repeat(50));
        
        if (result.filesRead && result.filesRead.length > 0) {
          logger.info(`\n📁 Files analyzed: ${result.filesRead.join(', ')}`);
        }
        
        // Suggest next steps
        this.suggestNextSteps();
        
      } else {
        logger.error(`❌ Task failed: ${result.error}`);
        this.conversationHistory.push(`AI Agent: Task failed - ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ Task execution failed: ${error}`);
      this.conversationHistory.push(`AI Agent: Task execution failed - ${error}`);
    }
  }

  private async chatResponse(message: string): Promise<void> {
    try {
      // For now, provide a helpful response
      const response = this.generateChatResponse(message);
      
      logger.info('\n🤖 AI Agent:');
      console.log(response);
      
      // Add to history
      this.conversationHistory.push(`AI Agent: ${response}`);
      
    } catch (error) {
      logger.error(`❌ Chat response failed: ${error}`);
    }
  }

  private generateChatResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! I'm your AI coding assistant. I can help you with:\n` +
             `• Analyzing code and suggesting improvements\n` +
             `• Reviewing functions and adding error handling\n` +
             `• Refactoring and optimizing code\n` +
             `• Setting up new features and components\n\n` +
             `What would you like to work on today?`;
    }
    
    if (lowerMessage.includes('how are you')) {
      return `I'm doing great! Ready to help you with any coding tasks. ` +
             `Just describe what you need help with, and I'll analyze your code and provide suggestions.`;
    }
    
    if (lowerMessage.includes('what can you do')) {
      return `I'm a Safe Agent that can:\n` +
             `• Read and analyze your project files\n` +
             `• Suggest code improvements and best practices\n` +
             `• Help with refactoring and optimization\n` +
             `• Provide implementation guidance\n` +
             `• Work safely on development branches only\n\n` +
             `Try asking me something like: "Can you help me add error handling to the login function?"`;
    }
    
    if (lowerMessage.includes('thank')) {
      return `You're welcome! I'm here to help make your coding more efficient and robust. ` +
             `Feel free to ask me anything about your code!`;
    }
    
    // Default response
    return `I understand you said: "${message}"\n\n` +
           `I'm here to help with coding tasks! Try asking me to:\n` +
           `• "Help me add error handling to the login function"\n` +
           `• "Review this code for security issues"\n` +
           `• "Suggest ways to optimize the database queries"\n` +
           `• "Help me refactor this component"\n\n` +
           `What would you like to work on?`;
  }

  private suggestNextSteps(): void {
    logger.info('\n💡 Next Steps:');
    logger.info('   • Ask me to analyze another part of your code');
    logger.info('   • Request help with implementation details');
    logger.info('   • Ask for best practices or patterns');
    logger.info('   • Type "context" to see current repository status');
    logger.info('   • Type "history" to see our conversation');
  }

  private showHelp(): void {
    logger.info('\n📚 Chat Commands:');
    logger.info('   help, ?          - Show this help message');
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
  }

  private showHistory(): void {
    if (this.conversationHistory.length === 0) {
      logger.info('📝 No conversation history yet');
      return;
    }
    
    logger.info('\n📝 Conversation History:');
    logger.info('=' .repeat(50));
    
    this.conversationHistory.forEach((entry, index) => {
      const prefix = entry.startsWith('User:') ? '💬' : '🤖';
      logger.info(`${prefix} ${entry}`);
      
      if (index < this.conversationHistory.length - 1) {
        logger.info('─' .repeat(30));
      }
    });
    
    logger.info('=' .repeat(50));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ChatAgentCLI();
  cli.start().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

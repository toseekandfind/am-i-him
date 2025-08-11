#!/usr/bin/env node

// Load environment variables first, before any imports
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import { SafeAgent, AgentTask } from '../agents/safe-agent.js';
import { logger } from '../util/log.js';
import { getConfig } from '../config.js';

class AgentCLI {
  private agent?: SafeAgent;
  private rl: readline.Interface;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    this.config = getConfig();
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('🤖 Safe Agent CLI - Interactive Coding Assistant');
      logger.info('=' .repeat(50));
      
      // Initialize agent
      this.agent = new SafeAgent();
      
      // Initialize agent in current directory
      await this.agent.initialize();
      
      // Show repo status
      await this.showRepoStatus();
      
      // Start interactive loop
      await this.interactiveLoop();
      
    } catch (error) {
      logger.error(`❌ CLI initialization failed: ${error}`);
      process.exit(1);
    }
  }

  private async showRepoStatus(): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      const status = await this.agent.getRepoStatus();
      
      logger.info('\n📊 Repository Status:');
      logger.info(`   Branch: ${status.currentBranch}`);
      logger.info(`   Clean: ${status.isClean ? '✅' : '⚠️'}`);
      logger.info(`   Last Commit: ${status.lastCommit}`);
      if (status.remoteUrl) {
        logger.info(`   Remote: ${status.remoteUrl}`);
      }
      
    } catch (error) {
      logger.warn(`Could not get repo status: ${error}`);
    }
  }

  private async interactiveLoop(): Promise<void> {
    logger.info('\n💡 Available Commands:');
    logger.info('   analyze <description> - Analyze a coding task');
    logger.info('   commit <description> - Analyze and commit changes');
    logger.info('   status - Show repository status');
    logger.info('   help - Show this help message');
    logger.info('   exit - Exit the CLI');
    logger.info('\n💬 Natural Language: Try "what can you do" or "hello"');
    
    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question('\n🤖 What would you like me to do? ', resolve);
      });
    };

    while (true) {
      try {
        const input = await askQuestion();
        const trimmed = input.trim();
        
        if (trimmed === 'exit' || trimmed === 'quit') {
          break;
        }
        
        // Help commands
        if (trimmed === 'help' || trimmed === '?' || trimmed.toLowerCase().includes('what can you do')) {
          this.showHelp();
          continue;
        }
        
        // Status commands
        if (trimmed === 'status' || trimmed.toLowerCase().includes('status')) {
          await this.showRepoStatus();
          continue;
        }
        
        // Analyze commands
        if (trimmed.startsWith('analyze ') || trimmed.toLowerCase().startsWith('analyze')) {
          const description = trimmed.replace(/^analyze\s+/i, '');
          if (description.trim()) {
            await this.analyzeTask(description);
          } else {
            logger.warn('❓ Please provide a description for analysis. Example: analyze add error handling');
          }
          continue;
        }
        
        // Commit commands
        if (trimmed.startsWith('commit ') || trimmed.toLowerCase().startsWith('commit')) {
          const description = trimmed.replace(/^commit\s+/i, '');
          if (description.trim()) {
            await this.commitTask(description);
          } else {
            logger.warn('❓ Please provide a description for commit. Example: commit refactor database logic');
          }
          continue;
        }
        
        // Exit commands
        if (trimmed === 'exit' || trimmed === 'quit' || trimmed.toLowerCase().includes('bye')) {
          break;
        }
        
        // Natural language responses
        if (trimmed.toLowerCase().includes('what can you do') || trimmed.toLowerCase().includes('capabilities')) {
          this.showHelp();
          continue;
        }
        
        if (trimmed.toLowerCase().includes('hello') || trimmed.toLowerCase().includes('hi')) {
          logger.info('👋 Hello! I\'m your Safe Agent. Type "help" to see what I can do!');
          continue;
        }
        
        logger.warn('❓ Unknown command. Type "help" for available commands.');
        logger.info('💡 Try: help, status, analyze <task>, or commit <task>');
        
      } catch (error) {
        logger.error(`❌ Command failed: ${error}`);
      }
    }
    
    logger.info('👋 Goodbye!');
    this.rl.close();
  }

  private showHelp(): void {
    logger.info('\n📚 Command Reference:');
    logger.info('   analyze <description> - Analyze a coding task with Claude');
    logger.info('   commit <description> - Analyze and commit changes to dev branch');
    logger.info('   status - Show current repository status');
    logger.info('   help - Show this help message');
    logger.info('   exit - Exit the CLI');
    
    logger.info('\n💬 Natural Language Examples:');
    logger.info('   "what can you do" - Show this help');
    logger.info('   "hello" - Greet the agent');
    logger.info('   "analyze add error handling" - Analyze a specific task');
    logger.info('   "commit refactor database" - Commit changes for a task');
    
    logger.info('\n🔒 Safety Features:');
    logger.info('   • Only works on development branches');
    logger.info('   • Never modifies main/master branches');
    logger.info('   • Creates new dev branches for changes');
    logger.info('   • Read-only file analysis');
    
    logger.info('\n🚀 Quick Start:');
    logger.info('   1. Try: "analyze improve the login function"');
    logger.info('   2. Try: "commit add user validation"');
    logger.info('   3. Check: "status"');
  }

  private async analyzeTask(description: string): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      logger.info(`\n🔍 Analyzing task: ${description}`);
      
      const task: AgentTask = {
        id: `task-${Date.now()}`,
        description,
        files: [] // Will read common project files
      };
      
      const result = await this.agent.executeTask(task);
      
      if (result.success) {
        logger.success('\n✅ Analysis completed successfully!');
        logger.info('\n📋 Analysis Results:');
        logger.info('=' .repeat(50));
        console.log(result.output);
        logger.info('=' .repeat(50));
        
        if (result.filesRead && result.filesRead.length > 0) {
          logger.info(`\n📁 Files analyzed: ${result.filesRead.join(', ')}`);
        }
      } else {
        logger.error(`❌ Analysis failed: ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ Task analysis failed: ${error}`);
    }
  }

  private async commitTask(description: string): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      logger.info(`\n💾 Analyzing and committing task: ${description}`);
      
      const task: AgentTask = {
        id: `commit-${Date.now()}`,
        description,
        files: [], // Will read common project files
        branch: `feature-${Date.now()}`,
        commitMessage: `Agent task: ${description}`
      };
      
      const result = await this.agent.executeTask(task);
      
      if (result.success) {
        logger.success('\n✅ Task committed successfully!');
        
        if (result.commitsMade && result.commitsMade.length > 0) {
          logger.info(`\n🌿 Development branch created: ${result.commitsMade[0]}`);
        }
        
        logger.info('\n📋 Analysis Results:');
        logger.info('=' .repeat(50));
        console.log(result.output);
        logger.info('=' .repeat(50));
        
      } else {
        logger.error(`❌ Task commit failed: ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ Task commit failed: ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new AgentCLI();
  cli.start().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

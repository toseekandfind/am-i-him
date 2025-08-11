#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import readline from 'readline';
import { SafeAgent, AgentTask } from '../agents/safe-agent.js';
import { logger } from '../util/log.js';

class SimpleAgentCLI {
  private agent?: SafeAgent;
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start(): Promise<void> {
    try {
      logger.info('🤖 Simple Safe Agent CLI');
      logger.info('=' .repeat(40));
      
      // Initialize agent
      this.agent = new SafeAgent();
      await this.agent.initialize();
      
      // Show simple menu
      this.showMenu();
      
      // Start simple command loop
      await this.commandLoop();
      
    } catch (error) {
      logger.error(`❌ CLI failed: ${error}`);
      process.exit(1);
    }
  }

  private showMenu(): void {
    logger.info('\n📋 Available Commands:');
    logger.info('   1. analyze <task>  - Analyze a coding task');
    logger.info('   2. commit <task>    - Analyze and commit changes');
    logger.info('   3. status           - Show repository status');
    logger.info('   4. help             - Show this menu');
    logger.info('   5. exit             - Exit the CLI');
    logger.info('\n💡 Example: analyze add error handling to login');
  }

  private async commandLoop(): Promise<void> {
    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        this.rl.question('\n🤖 Command: ', resolve);
      });
    };

    while (true) {
      try {
        const input = await askQuestion();
        const trimmed = input.trim().toLowerCase();
        
        if (trimmed === 'exit' || trimmed === 'quit' || trimmed === '5') {
          break;
        }
        
        if (trimmed === 'help' || trimmed === '4') {
          this.showMenu();
          continue;
        }
        
        if (trimmed === 'status' || trimmed === '3') {
          await this.showStatus();
          continue;
        }
        
        if (trimmed.startsWith('analyze ') || trimmed.startsWith('1 ')) {
          const task = input.replace(/^(analyze|1)\s+/i, '').trim();
          if (task) {
            await this.analyzeTask(task);
          } else {
            logger.warn('❓ Please provide a task description');
          }
          continue;
        }
        
        if (trimmed.startsWith('commit ') || trimmed.startsWith('2 ')) {
          const task = input.replace(/^(commit|2)\s+/i, '').trim();
          if (task) {
            await this.commitTask(task);
          } else {
            logger.warn('❓ Please provide a task description');
          }
          continue;
        }
        
        logger.warn('❓ Unknown command. Type "help" for available commands.');
        
      } catch (error) {
        logger.error(`❌ Command failed: ${error}`);
      }
    }
    
    logger.info('👋 Goodbye!');
    this.rl.close();
  }

  private async showStatus(): Promise<void> {
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
      logger.warn(`Could not get status: ${error}`);
    }
  }

  private async analyzeTask(description: string): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      logger.info(`\n🔍 Analyzing: ${description}`);
      
      const task: AgentTask = {
        id: `task-${Date.now()}`,
        description,
        files: []
      };
      
      const result = await this.agent.executeTask(task);
      
      if (result.success) {
        logger.success('\n✅ Analysis completed!');
        logger.info('\n📋 Results:');
        logger.info('=' .repeat(40));
        console.log(result.output);
        logger.info('=' .repeat(40));
      } else {
        logger.error(`❌ Analysis failed: ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ Task failed: ${error}`);
    }
  }

  private async commitTask(description: string): Promise<void> {
    try {
      if (!this.agent) {
        logger.error('Agent not initialized');
        return;
      }
      
      logger.info(`\n💾 Committing: ${description}`);
      
      const task: AgentTask = {
        id: `commit-${Date.now()}`,
        description,
        files: [],
        branch: `feature-${Date.now()}`,
        commitMessage: `Agent task: ${description}`
      };
      
      const result = await this.agent.executeTask(task);
      
      if (result.success) {
        logger.success('\n✅ Task committed!');
        
        if (result.commitsMade && result.commitsMade.length > 0) {
          logger.info(`🌿 Branch: ${result.commitsMade[0]}`);
        }
        
        logger.info('\n📋 Results:');
        logger.info('=' .repeat(40));
        console.log(result.output);
        logger.info('=' .repeat(40));
        
      } else {
        logger.error(`❌ Commit failed: ${result.error}`);
      }
      
    } catch (error) {
      logger.error(`❌ Task failed: ${error}`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SimpleAgentCLI();
  cli.start().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

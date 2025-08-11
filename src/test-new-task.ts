#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { SafeAgent } from './agents/safe-agent.js';
import { logger } from './util/log.js';

async function testNewTask(): Promise<void> {
  try {
    logger.info('🧪 Testing Safe Agent with New Task');
    logger.info('=' .repeat(50));
    
    // Create agent
    const agent = new SafeAgent();
    
    // Initialize in current directory
    await agent.initialize();
    
    // Show current status
    const status = await agent.getRepoStatus();
    logger.info(`🌿 Working on branch: ${status.currentBranch}`);
    
    // Test a new task: refactoring database connection
    logger.info('\n🔍 New Task: Refactor database connection with connection pooling');
    const task = {
      id: 'refactor-db',
      description: 'refactor the database connection to use connection pooling for better performance and reliability',
      files: []
    };
    
    logger.info('🚀 Executing task with real OpenAI API...');
    const result = await agent.executeTask(task);
    
    if (result.success) {
      logger.success('✅ Task analysis successful!');
      logger.info('\n📋 AI Analysis Results:');
      logger.info('=' .repeat(50));
      console.log(result.output);
      logger.info('=' .repeat(50));
      
      if (result.filesRead && result.filesRead.length > 0) {
        logger.info(`\n📁 Files analyzed: ${result.filesRead.join(', ')}`);
      }
      
      logger.info('\n🎯 This demonstrates the agent can:');
      logger.info('   • Analyze complex coding tasks');
      logger.info('   • Provide detailed implementation guidance');
      logger.info('   • Suggest best practices and patterns');
      logger.info('   • Work with real AI models (GPT-4)');
      
    } else {
      logger.error(`❌ Task analysis failed: ${result.error}`);
    }
    
    logger.success('\n🎉 New task test completed!');
    
  } catch (error) {
    logger.error(`❌ Test failed: ${error}`);
    process.exit(1);
  }
}

// Run the test
testNewTask();

#!/usr/bin/env node

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { SafeAgent } from './agents/safe-agent.js';
import { logger } from './util/log.js';

async function testSimpleAgent(): Promise<void> {
  try {
    logger.info('🧪 Testing Simple Safe Agent');
    logger.info('=' .repeat(40));
    
    // Create agent
    const agent = new SafeAgent();
    
    // Initialize in current directory
    await agent.initialize();
    
    // Test 1: Get repository status
    logger.info('\n📊 Test 1: Repository Status');
    const status = await agent.getRepoStatus();
    logger.info(`   Branch: ${status.currentBranch}`);
    logger.info(`   Clean: ${status.isClean ? '✅' : '⚠️'}`);
    logger.info(`   Last Commit: ${status.lastCommit}`);
    
    // Test 2: Analyze a simple task
    logger.info('\n🔍 Test 2: Task Analysis');
    const task = {
      id: 'test-1',
      description: 'add error handling to the login function',
      files: []
    };
    
    const result = await agent.executeTask(task);
    
    if (result.success) {
      logger.success('✅ Task analysis successful!');
      logger.info('\n📋 Analysis Results:');
      logger.info('=' .repeat(40));
      console.log(result.output);
      logger.info('=' .repeat(40));
      
      if (result.filesRead && result.filesRead.length > 0) {
        logger.info(`\n📁 Files analyzed: ${result.filesRead.join(', ')}`);
      }
    } else {
      logger.error(`❌ Task analysis failed: ${result.error}`);
    }
    
    logger.success('\n🎉 Simple agent test completed!');
    
  } catch (error) {
    logger.error(`❌ Test failed: ${error}`);
    process.exit(1);
  }
}

// Run the test
testSimpleAgent();

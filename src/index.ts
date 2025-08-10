#!/usr/bin/env node

import dotenv from 'dotenv';
import { Orchestrator } from './agents/orchestrator.js';
import { Worker } from './agents/worker.js';
import { logger } from './util/log.js';

// Load environment variables
dotenv.config();

export { Orchestrator, Worker };

export async function runWorkflow(
  client: string,
  source: 'jira' | 'xml',
  data: any[]
): Promise<void> {
  try {
    logger.info(`Starting workflow for ${client} using ${source} source`);
    
    // Create orchestrator and plan
    const orchestrator = new Orchestrator();
    const plan = await orchestrator.createPlan(client, source, data);
    
    logger.info(`Created plan with ${plan.tasks.length} tasks`);
    
    // Process tasks with worker
    const worker = new Worker();
    const results = await worker.processBatch(plan.tasks);
    
    logger.success(`Workflow completed: ${results.created} tasks created, ${results.failed} failed`);
    
    if (results.errors.length > 0) {
      logger.warn('Errors encountered:');
      results.errors.forEach(error => logger.error(error));
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Workflow failed: ${errorMessage}`);
    throw error;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, client, source, ...args] = process.argv;
  
  if (!client || !source) {
    console.log('Usage: npm run start <client> <source> [data...]');
    console.log('Example: npm run start "Salt Lake" jira');
    console.log('Example: npm run start "Blackstone" xml');
    process.exit(1);
  }
  
  if (source !== 'jira' && source !== 'xml') {
    console.error('Source must be either "jira" or "xml"');
    process.exit(1);
  }
  
  // For demo purposes, create sample data
  const sampleData = source === 'jira' 
    ? [
        { key: 'SL-123', summary: 'Sample Jira ticket', description: 'This is a test ticket' }
      ]
    : [
        { id: 'xml-1', title: 'Sample XML item', content: 'This is test XML content' }
      ];
  
  runWorkflow(client, source, sampleData).catch((error) => {
    logger.error(`CLI execution failed: ${error}`);
    process.exit(1);
  });
} 
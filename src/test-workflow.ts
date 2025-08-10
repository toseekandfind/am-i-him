#!/usr/bin/env node

import dotenv from 'dotenv';
import { Orchestrator } from './agents/orchestrator.js';
import { Worker } from './agents/worker.js';
import { logger } from './util/log.js';
import { JiraTicket, XmlParsedItem } from './agents/plan_types.js';

// Load environment variables
dotenv.config();

async function testJiraWorkflow(): Promise<void> {
  logger.info('Testing Jira workflow...');
  
  const sampleTickets: JiraTicket[] = [
    {
      key: 'SL-123',
      summary: 'Implement user authentication system',
      description: 'Create a secure authentication system with JWT tokens and password hashing',
      priority: 'high',
      status: 'To Do',
      assignee: 'john.doe',
      created: '2024-01-15T10:00:00Z',
      updated: '2024-01-15T10:00:00Z',
      links: ['https://jira.com/browse/SL-123']
    },
    {
      key: 'SL-124',
      summary: 'Design responsive dashboard UI',
      description: 'Create a modern, responsive dashboard interface for the admin panel',
      priority: 'medium',
      status: 'In Progress',
      assignee: 'alice.johnson',
      created: '2024-01-14T14:30:00Z',
      updated: '2024-01-15T09:15:00Z',
      links: ['https://jira.com/browse/SL-124']
    }
  ];
  
  try {
    const orchestrator = new Orchestrator();
    const plan = await orchestrator.createPlan('Salt Lake', 'jira', sampleTickets);
    
    logger.info(`Created plan with ${plan.tasks.length} tasks`);
    logger.info(`Plan summary: ${plan.summary}`);
    
    // Log the tasks that would be created
    plan.tasks.forEach((task, index) => {
      logger.info(`Task ${index + 1}: ${task.title}`);
      logger.info(`  Project: ${task.project}`);
      logger.info(`  Tags: ${task.tags.join(', ')}`);
      logger.info(`  Source: ${task.source_type} - ${task.source_key}`);
    });
    
    logger.success('Jira workflow test completed successfully');
    
  } catch (error) {
    logger.error(`Jira workflow test failed: ${error}`);
  }
}

async function testXmlWorkflow(): Promise<void> {
  logger.info('Testing XML workflow...');
  
  const sampleXmlItems: XmlParsedItem[] = [
    {
      key: 'xml-001',
      summary: 'Review quarterly financial reports',
      description: 'Analyze Q4 2024 financial performance and prepare executive summary',
      priority: 'high',
      status: 'To Do',
      assignee: 'finance-team',
      created: '2024-01-15T10:00:00Z',
      updated: '2024-01-15T10:00:00Z',
      links: ['https://example.com/xml-001']
    },
    {
      key: 'xml-002',
      summary: 'Update client presentation materials',
      description: 'Refresh slides and collateral for upcoming client meetings',
      priority: 'medium',
      status: 'In Progress',
      assignee: 'marketing-team',
      created: '2024-01-14T14:30:00Z',
      updated: '2024-01-15T09:15:00Z',
      links: ['https://example.com/xml-002']
    }
  ];
  
  try {
    const orchestrator = new Orchestrator();
    const plan = await orchestrator.createPlan('Blackstone', 'xml', sampleXmlItems);
    
    logger.info(`Created plan with ${plan.tasks.length} tasks`);
    logger.info(`Plan summary: ${plan.summary}`);
    
    // Log the tasks that would be created
    plan.tasks.forEach((task, index) => {
      logger.info(`Task ${index + 1}: ${task.title}`);
      logger.info(`  Project: ${task.project}`);
      logger.info(`  Tags: ${task.tags.join(', ')}`);
      logger.info(`  Source: ${task.source_type} - ${task.source_key}`);
    });
    
    logger.success('XML workflow test completed successfully');
    
  } catch (error) {
    logger.error(`XML workflow test failed: ${error}`);
  }
}

async function testWorker(): Promise<void> {
  logger.info('Testing Worker with sample task...');
  
  const sampleTask = {
    project: 'Test Project',
    title: 'This is a test task with a very long title that exceeds the 80 character limit and should be normalized by the AI',
    note: 'This is a test note that contains detailed information about what needs to be done. It includes context, requirements, and other relevant details that help understand the task better.',
    tags: ['Test', 'Sample', 'Workflow'],
    due: '2024-01-31',
    source_key: 'test-001',
    source_type: 'xml' as const
  };
  
  try {
    const worker = new Worker();
    const result = await worker.processTask(sampleTask);
    
    if (result.success) {
      logger.success('Worker test completed successfully');
      logger.info(`Task ID: ${result.taskId}`);
    } else {
      logger.error(`Worker test failed: ${result.error}`);
    }
    
  } catch (error) {
    logger.error(`Worker test failed: ${error}`);
  }
}

async function main(): Promise<void> {
  try {
    logger.info('Starting workflow system tests...');
    
    // Test Jira workflow
    await testJiraWorkflow();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test XML workflow
    await testXmlWorkflow();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test Worker (this will fail if MCP server is not running, which is expected)
    await testWorker();
    
    logger.success('All tests completed!');
    
  } catch (error) {
    logger.error(`Test suite failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
} 
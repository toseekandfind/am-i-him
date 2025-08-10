#!/usr/bin/env node

import dotenv from 'dotenv';
import { logger } from '../util/log.js';
import { Orchestrator } from '../agents/orchestrator.js';
import { Worker } from '../agents/worker.js';
import { JiraTicket } from '../agents/plan_types.js';

// Load environment variables
dotenv.config();

async function pullJiraTickets(): Promise<JiraTicket[]> {
  const mcpPort = process.env.MCP_PORT || 3333;
  const jql = process.env.JIRA_JQL || 'project = SL AND updated >= -1d';
  
  logger.info(`Pulling Jira tickets with JQL: ${jql}`);
  
  try {
    const response = await fetch(`http://localhost:${mcpPort}/jira/pull_tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, max_results: 50 })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    logger.success(`Successfully pulled ${result.count} tickets from Jira`);
    
    return result.tickets;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to pull Jira tickets: ${errorMessage}`);
    throw error;
  }
}

async function runJiraSync(): Promise<void> {
  try {
    logger.info('Starting Jira sync workflow for Salt Lake client');
    
    // Pull tickets from Jira
    const tickets = await pullJiraTickets();
    
    if (tickets.length === 0) {
      logger.info('No tickets found, nothing to sync');
      return;
    }
    
    // Create orchestrator plan
    const orchestrator = new Orchestrator();
    const plan = await orchestrator.createJiraPlan('Salt Lake', tickets);
    
    logger.info(`Orchestrator created plan with ${plan.tasks.length} tasks`);
    logger.info(`Plan summary: ${plan.summary}`);
    
    // Process tasks with worker
    const worker = new Worker();
    const results = await worker.processBatch(plan.tasks);
    
    // Print summary table
    printSummaryTable(plan, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Jira sync failed: ${errorMessage}`);
    throw error;
  }
}

function printSummaryTable(plan: any, results: any): void {
  logger.info('\n=== Jira Sync Summary ===');
  logger.info(`Client: ${plan.client}`);
  logger.info(`Source: ${plan.source}`);
  logger.info(`Tasks planned: ${plan.tasks.length}`);
  logger.info(`Tasks created: ${results.created}`);
  logger.info(`Tasks failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    logger.warn('Errors encountered:');
    results.errors.forEach((error: string, index: number) => {
      logger.warn(`  ${index + 1}. ${error}`);
    });
  }
  
  logger.info('========================\n');
}

// Export for use in other modules
export { runJiraSync };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runJiraSync().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
} 
#!/usr/bin/env node

import dotenv from 'dotenv';
import { logger } from '../util/log.js';
import { Orchestrator } from '../agents/orchestrator.js';
import { Worker } from '../agents/worker.js';
import { XmlParsedItem } from '../agents/plan_types.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

async function readClipboard(): Promise<string> {
  try {
    logger.info('Reading XML content from clipboard...');
    
    const { stdout } = await execAsync('pbpaste');
    const content = stdout.trim();
    
    if (!content) {
      throw new Error('Clipboard is empty');
    }
    
    logger.info(`Read ${content.length} characters from clipboard`);
    return content;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to read clipboard: ${errorMessage}`);
    throw new Error('Failed to read clipboard content. Please ensure XML content is copied to clipboard.');
  }
}

async function parseXmlContent(xmlContent: string): Promise<XmlParsedItem[]> {
  const mcpPort = process.env.MCP_PORT || 3333;
  
  logger.info('Parsing XML content via MCP...');
  
  try {
    const response = await fetch(`http://localhost:${mcpPort}/jira/pull_tickets_from_xml`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xml_content: xmlContent })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`XML parsing failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    logger.success(`Successfully parsed ${result.count} items from XML`);
    
    return result.tickets;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse XML content: ${errorMessage}`);
    throw error;
  }
}

async function runXmlSync(): Promise<void> {
  try {
    logger.info('Starting XML sync workflow for Blackstone client');
    
    // Read XML content from clipboard
    const xmlContent = await readClipboard();
    
    // Parse XML content
    const parsedItems = await parseXmlContent(xmlContent);
    
    if (parsedItems.length === 0) {
      logger.info('No items found in XML, nothing to sync');
      return;
    }
    
    // Create orchestrator plan
    const orchestrator = new Orchestrator();
    const plan = await orchestrator.createXmlPlan('Blackstone', parsedItems);
    
    logger.info(`Orchestrator created plan with ${plan.tasks.length} tasks`);
    logger.info(`Plan summary: ${plan.summary}`);
    
    // Process tasks with worker
    const worker = new Worker();
    const results = await worker.processBatch(plan.tasks);
    
    // Print summary table
    printSummaryTable(plan, results);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`XML sync failed: ${errorMessage}`);
    throw error;
  }
}

function printSummaryTable(plan: any, results: any): void {
  logger.info('\n=== XML Sync Summary ===');
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
export { runXmlSync };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runXmlSync().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
} 
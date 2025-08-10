#!/usr/bin/env node

import dotenv from 'dotenv';
import { logger } from '../util/log.js';
import { runJiraSync } from './jira-sync.js';
import { runXmlSync } from './xml-sync.js';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

async function checkJiraReachability(): Promise<boolean> {
  const jiraBase = process.env.JIRA_BASE;
  if (!jiraBase) {
    logger.warn('JIRA_BASE not configured, assuming Jira is not reachable');
    return false;
  }

  try {
    logger.info('Checking Jira reachability...');
    
    // Try to connect to Jira with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${jiraBase}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${process.env.JIRA_BASIC}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      logger.success('Jira is reachable');
      return true;
    } else {
      logger.warn(`Jira responded with status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn('Jira connection timed out');
    } else {
      logger.warn(`Jira connection failed: ${error}`);
    }
    return false;
  }
}

async function openOmniFocus(): Promise<void> {
  try {
    await execAsync('open -a OmniFocus');
    logger.info('Opened OmniFocus');
  } catch (error) {
    logger.warn('Failed to open OmniFocus automatically');
  }
}

async function main(): Promise<void> {
  try {
    logger.info('Starting OmniFocus sync workflow...');
    
    // Check if MCP server is running
    try {
      const mcpPort = process.env.MCP_PORT || 3333;
      const mcpResponse = await fetch(`http://localhost:${mcpPort}/health`);
      if (!mcpResponse.ok) {
        throw new Error(`MCP server health check failed: ${mcpResponse.status}`);
      }
      logger.info('MCP server is running');
    } catch (error) {
      logger.error('MCP server is not running. Please start it with: npm run dev:mcp');
      process.exit(1);
    }
    
    // Check Jira reachability
    const jiraReachable = await checkJiraReachability();
    
    if (jiraReachable) {
      logger.info('Using Jira sync workflow');
      await runJiraSync();
    } else {
      logger.info('Using XML sync workflow');
      await runXmlSync();
    }
    
    // Open OmniFocus on completion
    await openOmniFocus();
    
    logger.success('Sync workflow completed successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Sync workflow failed: ${errorMessage}`);
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
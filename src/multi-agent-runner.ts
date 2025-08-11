#!/usr/bin/env node

import dotenv from 'dotenv';
import { Orchestrator } from './agents/orchestrator.js';
import { SafeAgent } from './agents/safe-agent.js';
import { logger } from './util/log.js';
import { JiraTicket, XmlParsedItem } from './agents/plan_types.js';

// Load environment variables
dotenv.config();

interface AgentStats {
  orchestrator: {
    plansCreated: number;
    totalTasks: number;
    errors: number;
  };
  agents: {
    totalProcessed: number;
    successful: number;
    failed: number;
    errors: string[];
  };
}

class MultiAgentRunner {
  private orchestrator: Orchestrator;
  private agents: SafeAgent[];
  private stats: AgentStats;
  private maxConcurrency: number;

  constructor(agentCount: number = 3, maxConcurrency: number = 2) {
    this.orchestrator = new Orchestrator();
    this.agents = Array.from({ length: agentCount }, () => new SafeAgent());
    this.maxConcurrency = maxConcurrency;
    this.stats = {
      orchestrator: { plansCreated: 0, totalTasks: 0, errors: 0 },
      agents: { totalProcessed: 0, successful: 0, failed: 0, errors: [] }
    };
  }

  async runJiraWorkflow(client: string, tickets: JiraTicket[]): Promise<void> {
    logger.info(`🚀 Starting Jira workflow for ${client} with ${tickets.length} tickets`);
    
    try {
      // Step 1: Orchestrator creates plan
      logger.info('📋 Orchestrator creating AI-powered plan...');
      const plan = await this.orchestrator.createPlan(client, 'jira', tickets);
      
      this.stats.orchestrator.plansCreated++;
      this.stats.orchestrator.totalTasks += plan.tasks.length;
      
      logger.success(`✅ Plan created: ${plan.tasks.length} tasks`);
      logger.info(`📝 Plan summary: ${plan.summary}`);
      
      // Step 2: Extract task descriptions and process with agents
      const taskDescriptions = plan.tasks.map(task => task.title);
      await this.processTasksWithAgents(taskDescriptions);
      
    } catch (error) {
      this.stats.orchestrator.errors++;
      logger.error(`❌ Jira workflow failed: ${error}`);
      throw error;
    }
  }

  async runXmlWorkflow(client: string, items: XmlParsedItem[]): Promise<void> {
    logger.info(`🚀 Starting XML workflow for ${client} with ${items.length} items`);
    
    try {
      // Step 1: Orchestrator creates plan
      logger.info('📋 Orchestrator creating AI-powered plan...');
      const plan = await this.orchestrator.createPlan(client, 'xml', items);
      
      this.stats.orchestrator.plansCreated++;
      this.stats.orchestrator.totalTasks += plan.tasks.length;
      
      logger.success(`✅ Plan created: ${plan.tasks.length} tasks`);
      logger.info(`📝 Plan summary: ${plan.summary}`);
      
      // Step 2: Extract task descriptions and process with agents
      const taskDescriptions = plan.tasks.map(task => task.title);
      await this.processTasksWithAgents(taskDescriptions);
      
    } catch (error) {
      this.stats.orchestrator.errors++;
      logger.error(`❌ XML workflow failed: ${error}`);
      throw error;
    }
  }

  private async processTasksWithAgents(tasks: string[]): Promise<void> {
    logger.info(`🔧 Distributing ${tasks.length} tasks across ${this.agents.length} agents`);
    
    // Distribute tasks evenly across agents
    const tasksPerAgent = Math.ceil(tasks.length / this.agents.length);
    const agentTasks: string[][] = [];
    
    for (let i = 0; i < this.agents.length; i++) {
      const start = i * tasksPerAgent;
      const end = Math.min(start + tasksPerAgent, tasks.length);
      agentTasks.push(tasks.slice(start, end));
    }
    
    // Process tasks in parallel with controlled concurrency per agent
    const agentPromises = agentTasks.map(async (agentTaskBatch, agentIndex) => {
      if (agentTaskBatch.length === 0) return;
      
      logger.info(`🤖 Agent ${agentIndex + 1} processing ${agentTaskBatch.length} tasks`);
      
      // Use controlled concurrency within each agent
      const results = await this.processBatchWithConcurrency(agentTaskBatch, this.maxConcurrency);
      
      // Update stats
      this.stats.agents.totalProcessed += results.length;
      this.stats.agents.successful += results.filter(r => r.success).length;
      this.stats.agents.failed += results.filter(r => !r.success).length;
      
      const errors = results.filter(r => !r.success).map(r => r.error!);
      this.stats.agents.errors.push(...errors);
      
      logger.info(`✅ Agent ${agentIndex + 1} completed: ${results.filter(r => r.success).length}/${results.length} successful`);
    });
    
    await Promise.all(agentPromises);
  }

  private async processBatchWithConcurrency(
    tasks: string[], 
    maxConcurrency: number
  ): Promise<{ success: boolean; taskId?: string; error?: string }[]> {
    const results: { success: boolean; taskId?: string; error?: string }[] = [];
    const running: Promise<void>[] = [];
    
    for (const taskDescription of tasks) {
      // Wait if we've hit the concurrency limit
      if (running.length >= maxConcurrency) {
        await Promise.race(running);
        // Remove completed promises
        const completedIndex = running.findIndex(p => p.then(() => true).catch(() => true));
        if (completedIndex !== -1) {
          running.splice(completedIndex, 1);
        }
      }
      
      // Start processing this task
      const taskPromise = this.processSingleTask(taskDescription, results);
      running.push(taskPromise);
    }
    
    // Wait for all remaining tasks to complete
    await Promise.all(running);
    
    return results;
  }

  private async processSingleTask(
    taskDescription: string, 
    results: { success: boolean; taskId?: string; error?: string }[]
  ): Promise<void> {
    try {
      // Use a random agent for load balancing
      const agent = this.agents[Math.floor(Math.random() * this.agents.length)];
      
      // Initialize the agent if not already done
      await agent.initialize();
      
      // Create a Safe Agent task
      const task = {
        id: `task-${Date.now()}-${Math.random()}`,
        description: taskDescription,
        files: []
      };
      
      const result = await agent.executeTask(task);
      
      // Convert Safe Agent result to expected format
      results.push({
        success: result.success,
        taskId: result.taskId,
        error: result.error
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push({ success: false, error: errorMessage });
    }
  }

  getStats(): AgentStats {
    return { ...this.stats };
  }

  printStats(): void {
    logger.info('\n📊 Multi-Agent System Statistics');
    logger.info('=' .repeat(50));
    
    logger.info(`🎯 Orchestrator:`);
    logger.info(`   Plans Created: ${this.stats.orchestrator.plansCreated}`);
    logger.info(`   Total Tasks: ${this.stats.orchestrator.totalTasks}`);
    logger.info(`   Errors: ${this.stats.orchestrator.errors}`);
    
    logger.info(`\n👷 Workers (${this.workers.length}):`);
    logger.info(`   Total Processed: ${this.stats.workers.totalProcessed}`);
    logger.info(`   Successful: ${this.stats.workers.successful}`);
    logger.info(`   Failed: ${this.stats.workers.failed}`);
    
    if (this.stats.workers.errors.length > 0) {
      logger.info(`   Recent Errors: ${this.stats.workers.errors.slice(-3).join(', ')}`);
    }
    
    logger.info('=' .repeat(50));
  }
}

// Test the multi-agent system
async function testMultiAgentSystem(): Promise<void> {
  logger.info('🧪 Testing Multi-Agent System (3 Workers + 1 Orchestrator)');
  
  const runner = new MultiAgentRunner(3, 2); // 3 workers, max 2 concurrent tasks per worker
  
  // Sample data
  const sampleJiraTickets: JiraTicket[] = [
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
      updated: '2025-01-15T09:15:00Z',
      links: ['https://jira.com/browse/SL-124']
    },
    {
      key: 'SL-125',
      summary: 'Set up CI/CD pipeline',
      description: 'Configure automated testing and deployment pipeline for the project',
      priority: 'high',
      status: 'To Do',
      assignee: 'devops-team',
      created: '2025-01-15T11:00:00Z',
      updated: '2025-01-15T11:00:00Z',
      links: ['https://jira.com/browse/SL-125']
    }
  ];
  
  const sampleXmlItems: XmlParsedItem[] = [
    {
      key: 'xml-001',
      summary: 'Review quarterly financial reports',
      description: 'Analyze Q4 2024 financial performance and prepare executive summary',
      priority: 'high',
      status: 'To Do',
      assignee: 'finance-team',
      created: '2025-01-15T10:00:00Z',
      updated: '2025-01-15T10:00:00Z',
      links: ['https://example.com/xml-001']
    },
    {
      key: 'xml-002',
      summary: 'Update client presentation materials',
      description: 'Refresh slides and collateral for upcoming client meetings',
      priority: 'medium',
      status: 'In Progress',
      assignee: 'marketing-team',
      created: '2025-01-14T14:30:00Z',
      updated: '2025-01-15T09:15:00Z',
      links: ['https://example.com/xml-002']
    }
  ];
  
  try {
    // Test Jira workflow
    console.log('\n' + '='.repeat(60));
    await runner.runJiraWorkflow('Salt Lake', sampleJiraTickets);
    
    // Test XML workflow
    console.log('\n' + '='.repeat(60));
    await runner.runXmlWorkflow('Blackstone', sampleXmlItems);
    
    // Print final stats
    runner.printStats();
    
    logger.success('🎉 Multi-agent system test completed successfully!');
    
  } catch (error) {
    logger.error(`❌ Multi-agent system test failed: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMultiAgentSystem().catch((error) => {
    logger.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

import OpenAI from 'openai';
import { logger } from '../util/log.js';
import { WriteTask } from './plan_types.js';
import { getConfig } from '../config.js';

export class Worker {
  private client: OpenAI;
  private config: ReturnType<typeof getConfig>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({ apiKey });
    this.config = getConfig();
  }

  async processTask(task: WriteTask): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      logger.info(`Processing task: ${task.title}`);
      
      if (this.config.dryRun) {
        logger.info(`[DRY RUN] Would create task: ${task.title}`);
        return { success: true, taskId: 'dry-run-id' };
      }

      // Normalize the task using GPT-4o-mini if needed
      const normalizedTask = await this.normalizeTask(task);
      
      // Create the task via MCP
      const createResult = await this.createTask(normalizedTask);
      if (!createResult.success) {
        throw new Error(`Failed to create task: ${createResult.error}`);
      }

      // Append source information to the note
      const sourceInfo = this.createSourceInfo(task);
      await this.appendNote(createResult.taskId!, sourceInfo);

      logger.success(`Created task: ${task.title} (ID: ${createResult.taskId})`);
      return { success: true, taskId: createResult.taskId };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process task "${task.title}": ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private async normalizeTask(task: WriteTask): Promise<WriteTask> {
    // Use GPT-4o-mini for small transformations if needed
    if (task.title.length > 80 || task.note.length > 500) {
      return this.normalizeWithAI(task);
    }
    return task;
  }

  private async normalizeWithAI(task: WriteTask): Promise<WriteTask> {
    try {
      const prompt = `Normalize this OmniFocus task:

Title: ${task.title}
Note: ${task.note}
Tags: ${task.tags.join(', ')}

Rules:
- Keep title under 80 characters
- Keep note under 500 characters
- Preserve all important information
- Make title actionable and clear
- Maintain the original intent

Return JSON:
{
  "title": "normalized title",
  "note": "normalized note"
}`;

      const response = await this.client.chat.completions.create({
        model: this.config.openaiModelMini,
        messages: [
          { role: 'system', content: 'You are a task normalizer. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.warn('AI normalization failed, using original task');
        return task;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('No JSON in AI response, using original task');
        return task;
      }

      const normalized = JSON.parse(jsonMatch[0]);
      return {
        ...task,
        title: normalized.title || task.title,
        note: normalized.note || task.note
      };

    } catch (error) {
      logger.warn(`AI normalization failed: ${error}, using original task`);
      return task;
    }
  }

  private async createTask(task: WriteTask): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const mcpUrl = `http://localhost:${this.config.mcpPort}`;
      const response = await fetch(`${mcpUrl}/omnifocus/create_task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: task.project,
          title: task.title,
          note: task.note,
          tags: task.tags,
          due: task.due
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, taskId: result.id };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private async appendNote(taskId: string, text: string): Promise<void> {
    try {
      const mcpUrl = `http://localhost:${this.config.mcpPort}`;
      const response = await fetch(`${mcpUrl}/omnifocus/append_note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          text: text
        })
      });

      if (!response.ok) {
        logger.warn(`Failed to append note: HTTP ${response.status}`);
      }

    } catch (error) {
      logger.warn(`Failed to append note: ${error}`);
    }
  }

  private createSourceInfo(task: WriteTask): string {
    const timestamp = new Date().toISOString();
    let sourceInfo = `[${timestamp}] Source: ${task.source_type.toUpperCase()}`;
    
    if (task.source_key) {
      sourceInfo += ` | Key: ${task.source_key}`;
    }
    
    if (task.source_type === 'jira') {
      sourceInfo += `\nJira ticket: ${task.source_key}`;
    } else if (task.source_type === 'xml') {
      sourceInfo += `\nXML source: ${task.source_key}`;
    }
    
    return sourceInfo;
  }

  async processBatch(tasks: WriteTask[]): Promise<{
    created: number;
    failed: number;
    errors: string[];
  }> {
    logger.info(`Processing batch of ${tasks.length} tasks`);
    
    const results = await Promise.all(tasks.map(task => this.processTask(task)));
    
    const created = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const errors = results.filter(r => !r.success).map(r => r.error!);
    
    logger.info(`Batch complete: ${created} created, ${failed} failed`);
    
    return { created, failed, errors };
  }
} 
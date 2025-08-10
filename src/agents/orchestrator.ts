import OpenAI from 'openai';
import { logger } from '../util/log.js';
import { OrchestratorPlan, WriteTask, JiraTicket, XmlParsedItem } from './plan_types.js';
import { getClientConfig, getConfig } from '../config.js';

export class Orchestrator {
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

  async createPlan(
    client: string,
    source: 'jira' | 'xml',
    data: JiraTicket[] | XmlParsedItem[]
  ): Promise<OrchestratorPlan> {
    logger.info(`Creating plan for ${client} using ${source} source with ${data.length} items`);

    // Check if we're in dry-run mode
    if (this.config.dryRun) {
      logger.info(`[DRY RUN] Creating mock plan for ${client}`);
      return this.createMockPlan(client, source, data);
    }

    const clientConfig = getClientConfig(client);
    
    const systemPrompt = `You are an expert project manager who plans work at the epic/project level. 
Your job is to analyze work items and create a structured plan for OmniFocus tasks.

IMPORTANT RULES:
- Produce ONLY valid JSON output
- Keep task titles under 80 characters
- Put detailed context, links, and raw data into notes
- Use the client's default tags: ${clientConfig.tags.join(', ')}
- Put tasks in the "${clientConfig.omnifocusProject}" project
- Avoid creating duplicate tasks
- Use the source_key field to track original identifiers
- Make titles actionable and specific
- Group related work into logical tasks

Output format:
{
  "client": "${client}",
  "source": "${source}",
  "tasks": [
    {
      "project": "${clientConfig.omnifocusProject}",
      "title": "string (under 80 chars, actionable)",
      "note": "string (detailed context, links, raw data)",
      "tags": ${JSON.stringify(clientConfig.tags)},
      "due": "string (optional ISO date)",
      "source_key": "string (original key/id)",
      "source_type": "${source}"
    }
  ],
  "summary": "string (brief description of the plan)"
}`;

    const dataDescription = source === 'jira' 
      ? `Jira tickets: ${JSON.stringify(data, null, 2)}`
      : `XML parsed items: ${JSON.stringify(data, null, 2)}`;

    const userPrompt = `Create a plan for ${client} client using ${source} as the data source.

${dataDescription}

Create OmniFocus tasks that:
1. Have clear, actionable titles (under 80 characters)
2. Include all relevant context, links, and raw data in notes
3. Are properly tagged for organization using: ${clientConfig.tags.join(', ')}
4. Can be tracked back to their source
5. Are grouped logically to avoid duplication
6. Are placed in the "${clientConfig.omnifocusProject}" project

Return valid JSON only.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.openaiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      logger.debug(`OpenAI response: ${content}`);

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const plan = JSON.parse(jsonMatch[0]) as OrchestratorPlan;
      
      // Validate the plan structure
      this.validatePlan(plan);
      
      logger.info(`Successfully created plan with ${plan.tasks.length} tasks`);
      return plan;

    } catch (error) {
      logger.error(`Failed to create plan: ${error}`);
      
      // Retry once with a more explicit JSON instruction
      if (error instanceof Error && error.message.includes('JSON')) {
        logger.info('Retrying with explicit JSON instruction...');
        return this.retryWithJsonInstruction(client, source, data);
      }
      
      throw error;
    }
  }

  private async retryWithJsonInstruction(
    client: string,
    source: 'jira' | 'xml',
    data: JiraTicket[] | XmlParsedItem[]
  ): Promise<OrchestratorPlan> {
    const clientConfig = getClientConfig(client);
    
    const retryPrompt = `RETRY: Return ONLY valid JSON. No other text, no explanations.

Create a plan for ${client} client using ${source} source:

${JSON.stringify(data, null, 2)}

Use project: "${clientConfig.omnifocusProject}"
Use tags: ${JSON.stringify(clientConfig.tags)}
Return the JSON plan immediately.`;

    const response = await this.client.chat.completions.create({
      model: this.config.openaiModel,
      messages: [
        { role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON, no other text.' },
        { role: 'user', content: retryPrompt }
      ],
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI retry response');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to get valid JSON even after retry');
    }

    const plan = JSON.parse(jsonMatch[0]) as OrchestratorPlan;
    this.validatePlan(plan);
    return plan;
  }

  private createMockPlan(
    client: string,
    source: 'jira' | 'xml',
    data: JiraTicket[] | XmlParsedItem[]
  ): OrchestratorPlan {
    const clientConfig = getClientConfig(client);
    
    // Create mock tasks based on the input data
    const tasks = data.map((item, index) => ({
      project: clientConfig.omnifocusProject,
      title: `[MOCK] ${item.summary.substring(0, 60)}...`,
      note: `Mock task created from ${source} item: ${item.key}\n\nDescription: ${item.description}\nPriority: ${item.priority}\nStatus: ${item.status}\nAssignee: ${item.assignee}\nLinks: ${item.links.join(', ')}`,
      tags: clientConfig.tags,
      due: undefined,
      source_key: item.key,
      source_type: source as 'jira' | 'xml'
    }));

    return {
      client,
      source,
      tasks,
      summary: `Mock plan created for ${client} with ${tasks.length} tasks from ${source} source`
    };
  }

  private validatePlan(plan: OrchestratorPlan): void {
    if (!plan.client || !plan.source || !Array.isArray(plan.tasks)) {
      throw new Error('Invalid plan structure: missing required fields');
    }

    if (plan.source !== 'jira' && plan.source !== 'xml') {
      throw new Error('Invalid plan source: must be "jira" or "xml"');
    }

    plan.tasks.forEach((task, index) => {
      if (!task.project || !task.title || !Array.isArray(task.tags)) {
        throw new Error(`Invalid task ${index}: missing required fields`);
      }

      if (task.title.length > 80) {
        throw new Error(`Task ${index} title too long: ${task.title.length} chars`);
      }

      if (task.source_type !== 'jira' && task.source_type !== 'xml') {
        throw new Error(`Invalid task ${index} source_type: must be "jira" or "xml"`);
      }
    });
  }

  async createJiraPlan(client: string, tickets: JiraTicket[]): Promise<OrchestratorPlan> {
    return this.createPlan(client, 'jira', tickets);
  }

  async createXmlPlan(client: string, items: XmlParsedItem[]): Promise<OrchestratorPlan> {
    return this.createPlan(client, 'xml', items);
  }
} 
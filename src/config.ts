export interface ClientConfig {
  name: string;
  omnifocusProject: string;
  jiraProject?: string;
  jqlQuery?: string;
  tags: string[];
  defaultPriority: 'high' | 'medium' | 'low';
}

export interface WorkflowConfig {
  clients: Record<string, ClientConfig>;
  defaultClient: string;
  mcpPort: number;
  openaiModel: string;
  openaiModelMini: string;
  dryRun: boolean;
}

export const defaultConfig: WorkflowConfig = {
  clients: {
    'Salt Lake': {
      name: 'Salt Lake',
      omnifocusProject: 'Salt Lake',
      jiraProject: 'SL',
      jqlQuery: 'project = SL AND updated >= -1d ORDER BY priority DESC, updated DESC',
      tags: ['Client:Salt Lake', 'Source:Jira', 'Status:Active', 'Priority:Medium'],
      defaultPriority: 'medium'
    },
    'Blackstone': {
      name: 'Blackstone',
      omnifocusProject: 'Blackstone',
      tags: ['Client:Blackstone', 'Source:XML', 'Status:Active', 'Priority:Medium'],
      defaultPriority: 'medium'
    }
  },
  defaultClient: 'Salt Lake',
  mcpPort: 3333,
  openaiModel: 'gpt-4o',           // GPT-4 for Orchestrator (high-level planning)
  openaiModelMini: 'gpt-4o-mini', // GPT-4 Mini for Workers (task execution)
  dryRun: false
};

export function getConfig(): WorkflowConfig {
  const config = { ...defaultConfig };
  
  // Override with environment variables
  if (process.env.MCP_PORT) {
    config.mcpPort = parseInt(process.env.MCP_PORT, 10);
  }
  
  if (process.env.DRY_RUN) {
    config.dryRun = process.env.DRY_RUN === 'true';
  }
  
  if (process.env.OPENAI_MODEL) {
    config.openaiModel = process.env.OPENAI_MODEL;
  }
  
  if (process.env.OPENAI_MODEL_MINI) {
    config.openaiModelMini = process.env.OPENAI_MODEL_MINI;
  }
  

  
  return config;
}

export function getClientConfig(clientName: string): ClientConfig {
  const config = getConfig();
  const clientConfig = config.clients[clientName];
  
  if (!clientConfig) {
    throw new Error(`Unknown client: ${clientName}. Available clients: ${Object.keys(config.clients).join(', ')}`);
  }
  
  return clientConfig;
}

export function getOmniFocusProject(clientName: string): string {
  return getClientConfig(clientName).omnifocusProject;
}

export function getJiraProject(clientName: string): string | undefined {
  return getClientConfig(clientName).jiraProject;
}

export function getJqlQuery(clientName: string): string | undefined {
  return getClientConfig(clientName).jqlQuery;
} 
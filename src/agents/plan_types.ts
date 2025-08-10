export type PlanItem = {
  client: string;
  source: 'jira' | 'xml';
  payload: unknown; // JQL or parsed items
};

export type WriteTask = {
  project: string;
  title: string;
  note: string;
  tags: string[];
  due?: string;
  source_key?: string; // Jira key or XML identifier
  source_type: 'jira' | 'xml';
};

export type OrchestratorPlan = {
  client: string;
  source: 'jira' | 'xml';
  tasks: WriteTask[];
  summary: string;
};

export type JiraTicket = {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  description: string;
  created: string;
  updated: string;
  links: string[];
};

export type XmlParsedItem = {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  description: string;
  created: string;
  updated: string;
  links: string[];
};

export type ClientConfig = {
  name: string;
  project: string;
  jql?: string;
  xml_source?: string;
  tags: string[];
  default_priority: string;
}; 
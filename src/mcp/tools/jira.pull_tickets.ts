import { Request, Response } from 'express';
import { logger } from '../../util/log.js';
import { JiraTicket } from '../../agents/plan_types.js';

export async function pullTicketsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { jql, max_results = 50 } = req.body;

    // Validate required fields
    if (!jql) {
      res.status(400).json({ 
        error: 'Missing required field: jql',
        received: { jql, max_results }
      });
      return;
    }

    // Validate environment variables
    const jiraBase = process.env.JIRA_BASE;
    const jiraBasic = process.env.JIRA_BASIC;

    if (!jiraBase || !jiraBasic) {
      res.status(500).json({ 
        error: 'Jira configuration missing',
        required: ['JIRA_BASE', 'JIRA_BASIC']
      });
      return;
    }

    logger.info(`Pulling Jira tickets with JQL: ${jql}`);

    // Construct Jira search URL
    const searchUrl = `${jiraBase}/rest/api/3/search`;
    
    // Prepare search payload
    const searchPayload = {
      jql: jql,
      maxResults: Math.min(max_results, 100), // Jira limit
      fields: ['summary', 'status', 'priority', 'assignee', 'description', 'created', 'updated', 'issuelinks'],
      expand: ['names', 'schema']
    };

    // Make request to Jira
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${jiraBasic}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(searchPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Jira API error: ${response.status} ${response.statusText}`);
      logger.debug(`Error details: ${errorText}`);
      
      res.status(response.status).json({ 
        error: 'Jira API request failed',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      });
      return;
    }

    const jiraResponse = await response.json();
    
    // Transform Jira response to our format
    const tickets: JiraTicket[] = jiraResponse.issues?.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary || 'No summary',
      status: issue.fields.status?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'Medium',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      description: extractDescription(issue.fields.description),
      created: issue.fields.created || new Date().toISOString(),
      updated: issue.fields.updated || new Date().toISOString(),
      links: extractLinks(issue.fields.issuelinks, jiraBase)
    })) || [];

    logger.success(`Successfully pulled ${tickets.length} tickets from Jira`);
    
    res.json({ 
      content: `Pulled ${tickets.length} tickets from Jira`,
      tickets,
      count: tickets.length,
      jql,
      total: jiraResponse.total || 0
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Pull tickets handler error: ${errorMessage}`);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage 
    });
  }
}

function extractDescription(description: any): string {
  if (!description) return '';
  
  // Handle different description formats
  if (typeof description === 'string') {
    return description;
  }
  
  if (description.content) {
    // Atlassian Document Format
    return extractAtlassianContent(description.content);
  }
  
  return JSON.stringify(description);
}

function extractAtlassianContent(content: any[]): string {
  if (!Array.isArray(content)) return '';
  
  return content.map(item => {
    if (item.type === 'text' && item.text) {
      return item.text;
    }
    if (item.content && Array.isArray(item.content)) {
      return extractAtlassianContent(item.content);
    }
    return '';
  }).join(' ').trim();
}

function extractLinks(issueLinks: any[], jiraBase: string): string[] {
  if (!Array.isArray(issueLinks)) return [];
  
  const links: string[] = [];
  
  issueLinks.forEach(link => {
    if (link.inwardIssue) {
      links.push(`${jiraBase}/browse/${link.inwardIssue.key}`);
    }
    if (link.outwardIssue) {
      links.push(`${jiraBase}/browse/${link.outwardIssue.key}`);
    }
  });
  
  return links;
} 
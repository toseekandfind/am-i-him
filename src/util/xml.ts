import { XMLParser } from 'fast-xml-parser';
import { logger } from './log.js';

export interface ParsedJiraItem {
  key: string;
  summary: string;
  status: string;
  priority: string;
  assignee: string;
  description: string;
  created: string;
  updated: string;
  links: string[];
}

export function parseJiraXml(xmlContent: string): ParsedJiraItem[] {
  try {
    logger.debug('Parsing Jira XML content...');
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true
    });
    
    const parsed = parser.parse(xmlContent);
    
    // Handle different XML structures
    let items: any[] = [];
    
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      items = Array.isArray(parsed.rss.channel.item) 
        ? parsed.rss.channel.item 
        : [parsed.rss.channel.item];
    } else if (parsed.feed && parsed.feed.entry) {
      items = Array.isArray(parsed.feed.entry) 
        ? parsed.feed.entry 
        : [parsed.feed.entry];
    } else if (parsed.issues && parsed.issues.issue) {
      items = Array.isArray(parsed.issues.issue) 
        ? parsed.issues.issue 
        : [parsed.issues.issue];
    } else {
      logger.warn('Unknown XML structure, attempting generic parsing...');
      // Try to find any array of items
      for (const key in parsed) {
        if (Array.isArray(parsed[key])) {
          items = parsed[key];
          break;
        }
      }
    }
    
    if (!items || items.length === 0) {
      logger.warn('No items found in XML content');
      return [];
    }
    
    logger.info(`Found ${items.length} items in XML`);
    
    return items.map((item, index) => {
      try {
        return {
          key: extractKey(item) || `XML-${index + 1}`,
          summary: extractSummary(item) || 'Untitled',
          status: extractStatus(item) || 'Unknown',
          priority: extractPriority(item) || 'Medium',
          assignee: extractAssignee(item) || 'Unassigned',
          description: extractDescription(item) || '',
          created: extractDate(item, 'created') || new Date().toISOString(),
          updated: extractDate(item, 'updated') || new Date().toISOString(),
          links: extractLinks(item) || []
        };
      } catch (error) {
        logger.warn(`Failed to parse item ${index}: ${error}`);
        return {
          key: `XML-${index + 1}`,
          summary: 'Parse Error',
          status: 'Unknown',
          priority: 'Medium',
          assignee: 'Unassigned',
          description: `Failed to parse: ${JSON.stringify(item)}`,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          links: []
        };
      }
    });
    
  } catch (error) {
    logger.error(`XML parsing failed: ${error}`);
    throw new Error(`Failed to parse XML: ${error}`);
  }
}

function extractKey(item: any): string | null {
  return item.key || item.id || item.issueKey || item['@_key'] || null;
}

function extractSummary(item: any): string | null {
  return item.summary || item.title || item.name || item.subject || null;
}

function extractStatus(item: any): string | null {
  return item.status || item.state || item['@_status'] || null;
}

function extractPriority(item: any): string | null {
  return item.priority || item['@_priority'] || null;
}

function extractAssignee(item: any): string | null {
  if (item.assignee) {
    return typeof item.assignee === 'string' 
      ? item.assignee 
      : item.assignee.name || item.assignee.displayName || 'Unknown';
  }
  return null;
}

function extractDescription(item: any): string | null {
  return item.description || item.content || item.body || null;
}

function extractDate(item: any, field: string): string | null {
  const dateValue = item[field] || item[`@_${field}`];
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date.toISOString();
  } catch {
    return null;
  }
}

function extractLinks(item: any): string[] {
  const links: string[] = [];
  
  if (item.link) {
    if (Array.isArray(item.link)) {
      item.link.forEach((link: any) => {
        if (typeof link === 'string') {
          links.push(link);
        } else if (link.href || link['@_href']) {
          links.push(link.href || link['@_href']);
        }
      });
    } else if (typeof item.link === 'string') {
      links.push(item.link);
    } else if (item.link.href || item.link['@_href']) {
      links.push(item.link.href || item.link['@_href']);
    }
  }
  
  if (item.url) {
    links.push(item.url);
  }
  
  return links;
} 
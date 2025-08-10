import { Request, Response } from 'express';
import { logger } from '../../util/log.js';
import { parseJiraXml, ParsedJiraItem } from '../../util/xml.js';

export async function pullTicketsFromXmlHandler(req: Request, res: Response): Promise<void> {
  try {
    const { xml_content } = req.body;

    // Validate required fields
    if (!xml_content) {
      res.status(400).json({ 
        error: 'Missing required field: xml_content',
        received: { xml_content: xml_content ? 'present' : 'missing' }
      });
      return;
    }

    logger.info('Parsing Jira XML content');

    // Parse the XML content
    const parsedItems = parseJiraXml(xml_content);

    if (parsedItems.length === 0) {
      logger.warn('No items found in XML content');
      res.json({ 
        content: 'No items found in XML content',
        tickets: [],
        count: 0,
        source: 'xml'
      });
      return;
    }

    logger.success(`Successfully parsed ${parsedItems.length} items from XML`);
    
    res.json({ 
      content: `Parsed ${parsedItems.length} items from XML`,
      tickets: parsedItems,
      count: parsedItems.length,
      source: 'xml'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Pull tickets from XML handler error: ${errorMessage}`);
    res.status(500).json({ 
      error: 'Failed to parse XML content',
      message: errorMessage 
    });
  }
} 
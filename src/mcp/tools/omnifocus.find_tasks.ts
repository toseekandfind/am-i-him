import { Request, Response } from 'express';
import { logger } from '../../util/log.js';
import { runAppleScript, findTasksScript } from '../../util/applescript.js';

export async function findTasksHandler(req: Request, res: Response): Promise<void> {
  try {
    const { query } = req.body;

    // Validate required fields
    if (!query) {
      res.status(400).json({ 
        error: 'Missing required field: query',
        received: { query }
      });
      return;
    }

    logger.info(`Searching OmniFocus tasks with query: ${query}`);

    // Create AppleScript for task search
    const script = findTasksScript(query);

    // Execute AppleScript
    const result = await runAppleScript(script);

    if (!result.success) {
      logger.error(`AppleScript failed: ${result.error}`);
      res.status(500).json({ 
        error: 'Failed to search tasks in OmniFocus',
        details: result.error 
      });
      return;
    }

    // Parse the result
    try {
      let tasks: any[] = [];
      
      if (result.output && result.output.trim()) {
        // Handle potential AppleScript array formatting issues
        let output = result.output;
        
        // Fix common AppleScript array formatting issues
        if (output.startsWith('{') && output.endsWith('}')) {
          output = '[' + output.substring(1, output.length - 1) + ']';
        }
        
        // Replace AppleScript list separators
        output = output.replace(/, /g, ',');
        
        tasks = JSON.parse(output);
      }

      logger.info(`Found ${tasks.length} tasks matching query`);
      res.json({ 
        content: `Found ${tasks.length} tasks`,
        tasks,
        count: tasks.length,
        query 
      });

    } catch (parseError) {
      logger.error(`Failed to parse AppleScript result: ${parseError}`);
      logger.debug(`Raw output: ${result.output}`);
      
      // Try to extract any valid JSON from the output
      try {
        const jsonMatch = result.output!.match(/\[.*\]/);
        if (jsonMatch) {
          const tasks = JSON.parse(jsonMatch[0]);
          res.json({ 
            content: `Found ${tasks.length} tasks`,
            tasks,
            count: tasks.length,
            query 
          });
          return;
        }
      } catch (fallbackError) {
        logger.debug('Fallback JSON parsing also failed');
      }
      
      res.status(500).json({ 
        error: 'Failed to parse OmniFocus search results',
        raw_output: result.output 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Find tasks handler error: ${errorMessage}`);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage 
    });
  }
} 
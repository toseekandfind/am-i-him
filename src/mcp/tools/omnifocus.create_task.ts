import { Request, Response } from 'express';
import { logger } from '../../util/log.js';
import { runAppleScript, createOmniFocusScript } from '../../util/applescript.js';

export async function createTaskHandler(req: Request, res: Response): Promise<void> {
  try {
    const { project, title, note, tags, due } = req.body;

    // Validate required fields
    if (!project || !title) {
      res.status(400).json({ 
        error: 'Missing required fields',
        required: ['project', 'title'],
        received: { project, title, note, tags, due }
      });
      return;
    }

    logger.info(`Creating OmniFocus task: ${title} in project: ${project}`);

    // Create AppleScript for task creation
    const script = createOmniFocusScript(
      project,
      title,
      note || '',
      tags || [],
      due
    );

    // Execute AppleScript
    const result = await runAppleScript(script);

    if (!result.success) {
      logger.error(`AppleScript failed: ${result.error}`);
      res.status(500).json({ 
        error: 'Failed to create task in OmniFocus',
        details: result.error 
      });
      return;
    }

    // Parse the result
    try {
      const parsedResult = JSON.parse(result.output!);
      
      if (parsedResult.error) {
        logger.error(`OmniFocus error: ${parsedResult.error}`);
        res.status(400).json({ 
          error: 'OmniFocus operation failed',
          details: parsedResult.error 
        });
        return;
      }

      logger.success(`Task created successfully with ID: ${parsedResult.id}`);
      res.json({ 
        content: `Task created successfully`,
        id: parsedResult.id,
        project,
        title 
      });

    } catch (parseError) {
      logger.error(`Failed to parse AppleScript result: ${parseError}`);
      res.status(500).json({ 
        error: 'Failed to parse OmniFocus response',
        raw_output: result.output 
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Create task handler error: ${errorMessage}`);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage 
    });
  }
} 
import { Request, Response } from 'express';
import { logger } from '../../util/log.js';
import { runAppleScript, appendNoteScript } from '../../util/applescript.js';

export async function appendNoteHandler(req: Request, res: Response): Promise<void> {
  try {
    const { task_id, text } = req.body;

    // Validate required fields
    if (!task_id || !text) {
      res.status(400).json({ 
        error: 'Missing required fields',
        required: ['task_id', 'text'],
        received: { task_id, text }
      });
      return;
    }

    logger.info(`Appending note to task ID: ${task_id}`);

    // Create AppleScript for note appending
    const script = appendNoteScript(task_id, text);

    // Execute AppleScript
    const result = await runAppleScript(script);

    if (!result.success) {
      logger.error(`AppleScript failed: ${result.error}`);
      res.status(500).json({ 
        error: 'Failed to append note in OmniFocus',
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

      logger.success(`Note appended successfully to task: ${task_id}`);
      res.json({ 
        content: `Note appended successfully`,
        task_id,
        ok: true 
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
    logger.error(`Append note handler error: ${errorMessage}`);
    res.status(500).json({ 
      error: 'Internal server error',
      message: errorMessage 
    });
  }
} 
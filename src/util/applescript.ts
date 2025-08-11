import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './log.js';

const execAsync = promisify(exec);

export interface AppleScriptResult {
  success: boolean;
  output?: string;
  error?: string;
}

export async function runAppleScript(script: string): Promise<AppleScriptResult> {
  try {
    logger.debug(`Running AppleScript: ${script.substring(0, 100)}...`);
    
    const { stdout, stderr } = await execAsync(`osascript -e '${script}'`);
    
    if (stderr && stderr.trim()) {
      logger.warn(`AppleScript stderr: ${stderr}`);
    }
    
    return {
      success: true,
      output: stdout.trim()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`AppleScript execution failed: ${errorMessage}`);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

export function escapeAppleScriptString(str: string): string {
  // AppleScript uses double quotes, so we need to escape them properly
  // and handle single quotes carefully
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

export function createOmniFocusScript(projectName: string, title: string, note: string, tags: string[], dueDate?: string): string {
  const escapedProject = escapeAppleScriptString(projectName);
  const escapedTitle = escapeAppleScriptString(title);
  const escapedNote = escapeAppleScriptString(note);
  const escapedTags = tags.map(tag => escapeAppleScriptString(tag));
  
  let script = `
    tell application "OmniFocus"
      tell default document
        set targetProject to first project whose name is '${escapedProject}'
        if targetProject is missing value then
          return "{\\"error\\": \\"Project '${escapedProject}' not found\\"}"
        end if
        
        set newTask to make new task with properties {name:'${escapedTitle}', note:'${escapedNote}'} at end of tasks of targetProject
  `;
  
  if (dueDate) {
    script += `
        set due date of newTask to date '${dueDate}'
    `;
  }
  
  if (escapedTags.length > 0) {
    script += `
        repeat with tagName in {${escapedTags.map(tag => `'${tag}'`).join(', ')}}
          set targetTag to first tag whose name is tagName
          if targetTag is not missing value then
            add targetTag to tags of newTask
          end if
        end repeat
    `;
  }
  
  script += `
        return "{\\"id\\": \\"" & id of newTask & "\\"}"
      end tell
    end tell
  `;
  
  return script;
}

export function findTasksScript(query: string): string {
  const escapedQuery = escapeAppleScriptString(query);
  
  return `
    tell application "OmniFocus"
      tell default document
        set foundTasks to {}
        set allProjects to projects
        
        repeat with proj in allProjects
          set projectTasks to tasks of proj
          repeat with tsk in projectTasks
            if name of tsk contains '${escapedQuery}' or note of tsk contains '${escapedQuery}' then
              set taskInfo to "{\\"id\\": \\"" & id of tsk & "\\", \\"project\\": \\"" & name of proj & "\\", \\"name\\": \\"" & name of tsk & "\\", \\"note\\": \\"" & note of tsk & "\\"}"
              set end of foundTasks to taskInfo
            end if
          end repeat
        end repeat
        
        return "[" & (foundTasks as string) & "]"
      end tell
    end tell
  `;
}

export function appendNoteScript(taskId: string, text: string): string {
  const escapedText = escapeAppleScriptString(text);
  const timestamp = new Date().toLocaleString();
  
  return `
    tell application "OmniFocus"
      tell default document
        set targetTask to first task whose id is '${taskId}'
        if targetTask is missing value then
          return "{\\"error\\": \\"Task not found\\"}"
        end if
        
        set currentNote to note of targetTask
        if currentNote is "" then
          set note of targetTask to '[${timestamp}] ${escapedText}'
        else
          set note of targetTask to currentNote & '\\n\\n[${timestamp}] ${escapedText}'
        end if
        
        return "{\\"ok\\": true}"
      end tell
    end tell
  `;
} 
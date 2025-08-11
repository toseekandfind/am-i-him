import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../util/log.js';
import { getConfig } from '../config.js';

const execAsync = promisify(exec);

export interface AgentTask {
  id: string;
  description: string;
  files?: string[];
  branch?: string;
  commitMessage?: string;
}

export interface AgentResult {
  success: boolean;
  taskId: string;
  output?: string;
  error?: string;
  filesRead?: string[];
  commitsMade?: string[];
}

export class SafeAgent {
  private client: OpenAI;
  private config: ReturnType<typeof getConfig>;
  private currentRepo: string = '';

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.client = new OpenAI({ apiKey });
    this.config = getConfig();
  }

  async initialize(repoPath?: string): Promise<void> {
    try {
      // Determine current repo path
      this.currentRepo = repoPath || process.cwd();
      
      // Verify this is a git repository
      await this.verifyGitRepo();
      
      // Get current branch and verify it's safe
      const currentBranch = await this.getCurrentBranch();
      if (this.isProtectedBranch(currentBranch)) {
        throw new Error(`Cannot work on protected branch: ${currentBranch}`);
      }
      
      logger.info(`🔒 Safe Agent initialized in: ${this.currentRepo}`);
      logger.info(`🌿 Current branch: ${currentBranch}`);
      
    } catch (error) {
      throw new Error(`Failed to initialize Safe Agent: ${error}`);
    }
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      logger.info(`🚀 Executing task: ${task.description}`);
      
      // Verify we're still on a safe branch
      const currentBranch = await this.getCurrentBranch();
      if (this.isProtectedBranch(currentBranch)) {
        throw new Error(`Cannot execute task on protected branch: ${currentBranch}`);
      }

      // Step 1: Read relevant files
      const filesRead = await this.readFiles(task.files || []);
      
      // Step 2: Analyze with OpenAI
      const analysis = await this.analyzeWithOpenAI(task, filesRead);
      
      // Step 3: Execute the task (read-only operations)
      const output = await this.executeReadOnlyTask(task, analysis);
      
      // Step 4: If commit is requested and safe, create development branch
      let commitsMade: string[] = [];
      if (task.commitMessage && task.branch) {
        commitsMade = await this.safeCommit(task, analysis);
      }
      
      logger.success(`✅ Task completed successfully`);
      
      return {
        success: true,
        taskId: task.id,
        output,
        filesRead: Object.keys(filesRead),
        commitsMade
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Task execution failed: ${errorMessage}`);
      
      return {
        success: false,
        taskId: task.id,
        error: errorMessage
      };
    }
  }

  private async verifyGitRepo(): Promise<void> {
    try {
      await execAsync('git status', { cwd: this.currentRepo });
    } catch (error) {
      throw new Error('Not a git repository');
    }
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.currentRepo });
      return stdout.trim();
    } catch (error) {
      throw new Error('Failed to get current branch');
    }
  }

  private isProtectedBranch(branch: string): boolean {
    const protectedBranches = ['main', 'master', 'develop', 'production', 'staging'];
    return protectedBranches.includes(branch.toLowerCase());
  }

  private async readFiles(filePaths: string[]): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    
    if (filePaths.length === 0) {
      // Read common project files
      const commonFiles = ['package.json', 'README.md', '.gitignore', 'tsconfig.json'];
      filePaths = commonFiles.filter(file => this.fileExists(file));
    }
    
    for (const filePath of filePaths) {
      try {
        if (this.fileExists(filePath)) {
          const { stdout } = await execAsync(`cat "${filePath}"`, { cwd: this.currentRepo });
          files[filePath] = stdout;
        }
      } catch (error) {
        logger.warn(`Could not read file: ${filePath}`);
      }
    }
    
    return files;
  }

  private fileExists(filePath: string): boolean {
    try {
      require('fs').existsSync(require('path').join(this.currentRepo, filePath));
      return true;
    } catch {
      return false;
    }
  }

  private async analyzeWithOpenAI(task: AgentTask, files: Record<string, string>): Promise<string> {
    try {
      const fileContent = Object.entries(files)
        .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
        .join('\n\n');

      const prompt = `You are a safe coding assistant. Your task is: ${task.description}

Available files:
${fileContent}

IMPORTANT SAFETY RULES:
- You can ONLY read files and suggest changes
- You CANNOT modify protected branches (main, master, develop, production, staging)
- You can ONLY work on development/feature branches
- You can ONLY commit code, not execute commands
- Always suggest creating a new development branch for changes

Analyze the task and provide:
1. What needs to be done
2. Which files need to be modified
3. Suggested changes (code snippets)
4. Recommended branch name for the changes

Be specific and actionable.`;

      const response = await this.client.chat.completions.create({
        model: this.config.openaiModelMini || 'gpt-4o-mini',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.choices[0].message.content || 'No response from OpenAI';
      
    } catch (error) {
      throw new Error(`OpenAI analysis failed: ${error}`);
    }
  }

  private async executeReadOnlyTask(task: AgentTask, analysis: string): Promise<string> {
    // For now, just return the analysis
    // In the future, this could execute specific read-only operations
    return `Analysis completed:\n\n${analysis}`;
  }

  private async safeCommit(task: AgentTask, analysis: string): Promise<string[]> {
    try {
      const currentBranch = await this.getCurrentBranch();
      
      // Create a new development branch
      const devBranchName = `dev/${task.branch || 'agent-task'}-${Date.now()}`;
      
      logger.info(`🌿 Creating development branch: ${devBranchName}`);
      
      // Create and switch to new branch
      await execAsync(`git checkout -b "${devBranchName}"`, { cwd: this.currentRepo });
      
      // Stage all changes (this would be the actual file modifications)
      await execAsync('git add .', { cwd: this.currentRepo });
      
      // Commit with the provided message
      const commitMessage = task.commitMessage || `Agent task: ${task.description}`;
      await execAsync(`git commit -m "${commitMessage}"`, { cwd: this.currentRepo });
      
      logger.success(`✅ Committed to development branch: ${devBranchName}`);
      
      // Return to original branch
      await execAsync(`git checkout "${currentBranch}"`, { cwd: this.currentRepo });
      
      return [devBranchName];
      
    } catch (error) {
      throw new Error(`Safe commit failed: ${error}`);
    }
  }

  async getRepoStatus(): Promise<{
    currentBranch: string;
    isClean: boolean;
    lastCommit: string;
    remoteUrl?: string;
  }> {
    try {
      const [branch, status, lastCommit, remoteUrl] = await Promise.all([
        this.getCurrentBranch(),
        execAsync('git status --porcelain', { cwd: this.currentRepo }).then(r => r.stdout.trim()),
        execAsync('git log -1 --oneline', { cwd: this.currentRepo }).then(r => r.stdout.trim()),
        execAsync('git remote get-url origin', { cwd: this.currentRepo }).then(r => r.stdout.trim()).catch(() => '')
      ]);

      return {
        currentBranch: branch,
        isClean: status === '',
        lastCommit,
        remoteUrl: remoteUrl || undefined
      };
    } catch (error) {
      throw new Error(`Failed to get repo status: ${error}`);
    }
  }
}

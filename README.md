# GPT-5 + MCP + OmniFocus + Jira Workflow

A local workflow automation system that uses GPT-4o to orchestrate work between Jira and OmniFocus, with MCP (Model Context Protocol) tools for seamless integration.

## Features

- **One CLI command**: `npm run sync` handles both Jira and XML workflows
- **Intelligent orchestration**: GPT-4o plans work at epic/project level
- **Mini agents**: GPT-4o-mini handles task-level operations
- **OmniFocus integration**: AppleScript bridge for Mac, iPhone, and Watch sync
- **Jira integration**: Pull tickets directly or parse XML when blocked
- **Local execution**: Everything runs on your machine for privacy and speed
- **Flexible configuration**: Easy client and project management
- **Comprehensive testing**: Built-in test suite for validation

## Prerequisites

- Node.js 20+
- macOS with OmniFocus installed
- OpenAI API key
- Jira account with API access

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment configuration

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

#### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

#### Jira API Token
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new API token
3. Encode as base64: `echo -n "email:token" | base64`
4. Add to `.env`: `JIRA_BASIC=base64_encoded_value`

#### Jira Base URL
Add your Jira instance URL: `JIRA_BASE=https://your-domain.atlassian.net`

### 3. macOS Automation Permissions

The system needs permission to control OmniFocus via AppleScript:

1. **System Preferences** → **Security & Privacy** → **Privacy** → **Automation**
2. Enable **Terminal** or **iTerm** for **OmniFocus**
3. Enable **Terminal** or **iTerm** for **System Events**

### 4. OmniFocus Project Setup

Create projects for your clients:
- **Salt Lake** (for Jira-synced tasks)
- **Blackstone** (for XML-parsed tasks)

## Security & Privacy

### Environment Variables
This project uses environment variables to store sensitive configuration. **Never commit your `.env` file to version control.**

#### Protected Files
The following files are automatically ignored by Git:
- `.env` - Your actual API keys and secrets
- `.env.local` - Local overrides
- `*.key`, `*.pem` - Certificate files
- `secrets/` - Any secrets directory
- `config/secrets.*` - Secret configuration files

#### Safe to Commit
These files are safe to commit and share:
- `env.example` - Template showing required variables
- `src/config.ts` - Default configuration (no secrets)
- `package.json` - Dependencies and scripts

### API Key Security
- **OpenAI API Key**: Stored in `.env` file, never logged or displayed
- **Jira Credentials**: Base64 encoded and stored in `.env` file
- **Local Execution**: All API calls happen on your machine, not on external servers

### Best Practices
1. **Copy, don't rename**: Use `cp env.example .env` to create your environment file
2. **Check before commit**: Always verify `.env` is in `.gitignore` before committing
3. **Rotate keys**: Regularly rotate your API keys and update the `.env` file
4. **Monitor usage**: Check your OpenAI API usage dashboard for unexpected activity
5. **Dry-run mode**: Use `DRY_RUN=true` for testing without making real changes

### Verification Commands
```bash
# Verify .env is ignored
git status --ignored

# Check what would be committed
git add . && git status

# Verify no secrets in tracked files
grep -r "sk-" src/ || echo "No API keys found in source code"
```

## Usage

### Test the System

```bash
# Test the AI planning and task creation (without MCP server)
npm run test:workflow
```

This validates the core workflow logic using sample data.

### Start MCP Server

```bash
npm run dev:mcp
```

This starts the MCP server on port 3333 (or your configured port).

### Sync Workflows

#### Main Sync Command
```bash
npm run sync
```

Automatically detects Jira reachability and chooses the appropriate sync method.

#### Jira Sync
```bash
npm run sync:jira
```

Pulls tickets from Jira using the configured JQL query and creates OmniFocus tasks.

#### XML Sync
```bash
npm run sync:xml
```

Parses XML content from your clipboard and creates OmniFocus tasks.

### Direct Workflow Execution

```bash
# Run a specific workflow
npm run start "Salt Lake" jira
npm run start "Blackstone" xml

# Test orchestration directly
npm run orchestrate
```

## Configuration

The system is highly configurable through `src/config.ts`:

```typescript
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
  openaiModel: 'gpt-4o',
  openaiModelMini: 'gpt-4o-mini',
  dryRun: false
};
```

### Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `JIRA_BASE`: Jira instance URL
- `JIRA_BASIC`: Base64 encoded email:token
- `MCP_PORT`: MCP server port (default: 3333)
- `DRY_RUN`: Set to 'true' for testing without changes
- `OPENAI_MODEL`: Override default GPT model
- `OPENAI_MODEL_MINI`: Override default mini model

## How It Works

### 1. Orchestrator Agent (GPT-4o)
- Reads client configurations and modes
- Plans work at epic/project level
- Outputs structured JSON plans with `WriteTask` items
- Handles both Jira and XML workflows
- Uses client-specific tags and project mappings

### 2. Worker Agents (GPT-4o-mini)
- Execute individual task operations
- Normalize titles and notes
- Call MCP tools to create/update OmniFocus tasks
- Handle task-level transformations
- Append source tracking information

### 3. MCP Tools
- **OmniFocus**: Create tasks, find tasks, append notes
- **Jira**: Pull tickets, parse XML
- **Bridge**: AppleScript integration for OmniFocus

### 4. Workflow Modes

#### Jira Mode (Salt Lake)
- Queries Jira with configurable JQL
- Creates tasks in "Salt Lake" project
- Links back to Jira tickets
- Uses client-specific tags

#### XML Mode (Blackstone)
- Parses XML content from clipboard
- Creates tasks in "Blackstone" project
- Stores original XML in task notes
- Uses client-specific tags

## Project Structure

```
src/
├── agents/           # GPT-4o orchestrator and workers
│   ├── orchestrator.ts
│   ├── worker.ts
│   └── plan_types.ts
├── mcp/             # MCP server and tools
│   ├── server.ts
│   └── tools/
├── cli/             # Command-line interfaces
│   ├── of-sync.ts
│   ├── jira-sync.ts
│   └── xml-sync.ts
├── util/            # Utilities and helpers
│   ├── log.ts
│   ├── applescript.ts
│   └── xml.ts
├── config.ts        # Configuration system
├── index.ts         # Main entry point
└── test-workflow.ts # Test suite
```

## Testing

### Run Tests

```bash
# Test the workflow system
npm run test:workflow

# Build the project
npm run build

# Run unit tests (when implemented)
npm test
```

### Test Scenarios

The test suite validates:
- Jira ticket planning
- XML item planning
- Task normalization
- Configuration loading
- Error handling

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**: Check your API key and quota
2. **Jira Connection**: Verify JIRA_BASE and JIRA_BASIC in `.env`
3. **OmniFocus Permissions**: Grant Terminal automation access
4. **MCP Server**: Ensure it's running on the correct port

### Debug Mode

Set log level to DEBUG in `src/util/log.ts`:

```typescript
logger.setLevel(LogLevel.DEBUG);
```

### Dry Run Mode

Set `DRY_RUN=true` in `.env` to test without making actual OmniFocus changes.

## Development

### Adding New Clients

1. Extend the configuration in `src/config.ts`
2. Add client-specific tags and project mappings
3. Configure Jira JQL queries if needed
4. Test with `npm run test:workflow`

### Customizing Models

Override OpenAI models in `.env`:

```bash
OPENAI_MODEL=gpt-4o
OPENAI_MODEL_MINI=gpt-4o-mini
```

### Extending MCP Tools

Add new tools in `src/mcp/tools/` and register them in `src/mcp/server.ts`.

## Security Notes

- All API keys and tokens are stored locally in `.env`
- No data is sent to external services except OpenAI and Jira
- OmniFocus integration uses local AppleScript execution
- MCP server runs on localhost only

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Verify your environment configuration
3. Ensure all prerequisites are met
4. Check that OmniFocus is running and accessible
5. Run `npm run test:workflow` to validate the system

## License

MIT License - see LICENSE file for details. 
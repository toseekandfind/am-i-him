# GPT-5 + MCP + OmniFocus + Jira Workflow Demo

This demo shows how to use the local GPT-5 workflow system to automate work between Jira and OmniFocus.

## Prerequisites

1. **Environment Setup**: Copy `env.example` to `.env` and fill in your values
2. **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
3. **Jira Access**: Configure JIRA_BASE and JIRA_BASIC in `.env`
4. **OmniFocus**: Install and grant automation permissions

## Quick Start

### 1. Test the Workflow System

```bash
# Test the AI planning and task creation (without MCP server)
npm run test:workflow
```

This will test:
- Jira ticket planning with GPT-4o
- XML item planning with GPT-4o  
- Task normalization with GPT-4o-mini

### 2. Start the MCP Server

```bash
# Start the MCP server for OmniFocus integration
npm run dev:mcp
```

The server runs on port 3333 and provides:
- OmniFocus task creation
- Task finding and note appending
- Jira ticket pulling
- XML parsing

### 3. Run the Main Sync

```bash
# Automatically detect Jira reachability and sync
npm run sync
```

This will:
- Check if Jira is accessible
- Use Jira sync if available, XML sync if not
- Create tasks in the appropriate OmniFocus projects

## Manual Workflows

### Jira Sync Only

```bash
npm run sync:jira
```

Creates tasks from Jira tickets in the "Salt Lake" project.

### XML Sync Only

```bash
npm run xml:sync
```

Parses XML content from clipboard and creates tasks in the "Blackstone" project.

### Direct Orchestration

```bash
npm run orchestrate
```

Run the orchestrator agent directly for custom workflows.

## Configuration

The system is configured in `src/config.ts`:

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
  // ... other config
};
```

## How It Works

### 1. Orchestrator (GPT-4o)
- Analyzes work items (Jira tickets or XML)
- Creates structured plans with actionable tasks
- Ensures proper tagging and project placement
- Outputs JSON plans for worker processing

### 2. Worker (GPT-4o-mini)
- Normalizes task titles and notes
- Creates OmniFocus tasks via MCP
- Appends source tracking information
- Handles batch processing

### 3. MCP Tools
- **OmniFocus**: Create, find, and update tasks
- **Jira**: Pull tickets and parse XML
- **Bridge**: AppleScript integration

## Example Output

### Jira Workflow
```
[2024-01-15T10:00:00.000Z] INFO: Creating plan for Salt Lake using jira source with 2 items
[2024-01-15T10:00:00.000Z] INFO: Created plan with 2 tasks
[2024-01-15T10:00:00.000Z] INFO: Plan summary: Create authentication system and dashboard UI for Salt Lake project
[2024-01-15T10:00:00.000Z] INFO: Task 1: Implement user authentication system
[2024-01-15T10:00:00.000Z] INFO:   Project: Salt Lake
[2024-01-15T10:00:00.000Z] INFO:   Tags: Client:Salt Lake, Source:Jira, Status:Active, Priority:Medium
[2024-01-15T10:00:00.000Z] INFO:   Source: jira - SL-123
```

### XML Workflow
```
[2024-01-15T10:00:00.000Z] INFO: Creating plan for Blackstone using xml source with 2 items
[2024-01-15T10:00:00.000Z] INFO: Created plan with 2 tasks
[2024-01-15T10:00:00.000Z] INFO: Plan summary: Process financial reports and update presentation materials
[2024-01-15T10:00:00.000Z] INFO: Task 1: Review quarterly financial reports
[2024-01-15T10:00:00.000Z] INFO:   Project: Blackstone
[2024-01-15T10:00:00.000Z] INFO:   Tags: Client:Blackstone, Source:XML, Status:Active, Priority:Medium
[2024-01-15T10:00:00.000Z] INFO:   Source: xml - xml-001
```

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

Set `DRY_RUN=true` in `.env` to test without creating actual tasks.

## Next Steps

1. **Customize Configuration**: Modify client settings in `src/config.ts`
2. **Add New Clients**: Extend the configuration with additional clients
3. **Custom Tags**: Modify the default tag structure
4. **Advanced JQL**: Customize Jira queries for different projects
5. **XML Parsing**: Extend XML parsing for different formats

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Jira     │    │   XML        │    │  OmniFocus │
│   API      │    │  Clipboard   │    │  AppleScript│
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │   MCP       │
                    │   Server    │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │  Orchestrator│
                    │   (GPT-4o)  │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Worker    │
                    │(GPT-4o-mini)│
                    └─────────────┘
```

The system provides a complete workflow automation solution that intelligently plans and executes work using AI agents while maintaining local execution for privacy and performance. 
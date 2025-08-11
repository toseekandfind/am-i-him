# 🤖 Safe Agent System

A **project-agnostic, terminal-interactive coding assistant** that can work in any local repository with strict safety limits.

## 🎯 **What It Does**

- **🔍 Code Analysis**: Uses Claude to analyze coding tasks and suggest changes
- **🌿 Safe Development**: Only works on development branches, never on main/master
- **📁 Project Agnostic**: Works in any local git repository
- **🔒 Safety First**: Read-only operations + development branch commits only
- **💻 Terminal Interface**: Interactive CLI for natural language commands

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Orchestrator  │    │   Safe Agent    │    │   Terminal CLI  │
│   (GPT-5)       │    │   (GPT-5 Mini)  │    │   (Interactive) │
│                 │    │                 │    │                 │
│ • High-level    │    │ • Task execution│    │ • User commands │
│   planning      │    │ • Code analysis │    │ • Repository    │
│ • Workflow      │    │ • Safe commits  │    │   status        │
│   orchestration │    │ • File reading  │    │ • Help system   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start**

### **1. Setup in Any Repository**

```bash
# Clone this agent system repository
git clone <agent-repo-url>
cd <agent-repo-name>

# Run setup script in your target repository
./setup-agent.sh
```

### **2. Configure API Keys**

Edit the `.env` file in your target repository:

```bash
# OpenAI API key (for Orchestrator - high-level planning)
OPENAI_API_KEY=sk-your-openai-key-here

# Claude API key (for Agents - task execution and code analysis)
CLAUDE_API_KEY=sk-ant-your-claude-key-here
```

### **3. Switch to Development Branch**

```bash
# The agent only works on development branches
git checkout -b dev/your-feature-branch
```

### **4. Run the Agent**

```bash
# From the agent system repository
npm run agent

# Or run the CLI directly
npx tsx src/cli/agent-cli.ts
```

## 💻 **Available Commands**

### **Core Commands**
```bash
analyze <description>  # Analyze a coding task with Claude
commit <description>   # Analyze and commit changes to dev branch
status                # Show repository status
help                  # Show help message
exit                  # Exit the CLI
```

### **Examples**
```bash
🤖 What would you like me to do? analyze add error handling to the login function
🤖 What would you like me to do? commit refactor the database connection logic
🤖 What would you like me to do? status
```

## 🔒 **Safety Features**

### **Branch Protection**
- ❌ **Never works on**: `main`, `master`, `develop`, `production`, `staging`
- ✅ **Only works on**: Development/feature branches
- 🌿 **Auto-creates**: New development branches for changes

### **Operation Limits**
- 📖 **Read-only**: File analysis and code review
- 💾 **Safe commits**: Only to development branches
- 🚫 **No execution**: Cannot run arbitrary commands
- 🔍 **File access**: Only reads project files

### **Git Safety**
- 🔒 **Protected branches**: Automatically detected and blocked
- 🌿 **Development branches**: Safe for agent operations
- 📝 **Commit history**: All changes tracked and reversible

## 📁 **Project Agnostic Setup**

### **For Any Repository**

1. **Run setup script**:
   ```bash
   ./setup-agent.sh
   ```

2. **Add API keys** to `.env`

3. **Switch to dev branch**:
   ```bash
   git checkout -b dev/agent-test
   ```

4. **Use agent system** from the agent repository

### **Setup Script Features**
- ✅ **Git repository detection**
- 🔒 **Branch safety checking**
- 📝 **Environment file creation**
- 🔐 **Gitignore security setup**
- 📋 **Clear next steps**

## 🧠 **AI Models Used**

### **OpenAI GPT-5 (Orchestrator)**
- **Model**: GPT-5o
- **Purpose**: High-level planning and workflow orchestration
- **Use Case**: When you need strategic thinking and complex planning

### **OpenAI GPT-5 Mini (Safe Agent)**
- **Model**: GPT-5o-mini
- **Purpose**: Task execution, code analysis, and safe operations
- **Use Case**: Daily coding tasks, code review, and development work

## 📊 **Repository Status**

The agent provides real-time repository information:

```
📊 Repository Status:
   Branch: dev/feature-branch
   Clean: ✅
   Last Commit: feat: add user authentication
   Remote: https://github.com/user/repo.git
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required
OPENAI_API_KEY=sk-...          # OpenAI API key

# Optional
OPENAI_MODEL=gpt-5o            # OpenAI model override (Orchestrator)
OPENAI_MODEL_MINI=gpt-5o-mini  # OpenAI model override (Safe Agent)
```

### **Model Configuration**
```typescript
// Default models
openaiModel: 'gpt-5o'           // GPT-5 for Orchestrator
openaiModelMini: 'gpt-5o-mini'  // GPT-5 Mini for Safe Agent
```

## 🚨 **Error Handling**

### **Common Issues**
- **Protected Branch**: Switch to development branch
- **Missing API Keys**: Add keys to `.env` file
- **Not Git Repo**: Run in a git repository
- **Permission Denied**: Check file permissions

### **Safety Checks**
- ✅ **Git repository validation**
- ✅ **Branch protection verification**
- ✅ **API key validation**
- ✅ **File access permissions**

## 🔄 **Workflow Examples**

### **Code Review Workflow**
```bash
1. analyze review the authentication middleware for security issues
2. Review Claude's analysis
3. commit implement security improvements to auth middleware
4. Check the new development branch
```

### **Refactoring Workflow**
```bash
1. analyze refactor the database connection to use connection pooling
2. Review suggested changes
3. commit refactor database connection with connection pooling
4. Test changes in development branch
```

## 📚 **Integration with Existing Workflows**

### **CI/CD Integration**
- **Development branches**: Safe for agent operations
- **Main branches**: Protected from agent modifications
- **Pull requests**: Agent can analyze and suggest improvements

### **Team Collaboration**
- **Code review**: Agent can analyze pull requests
- **Feature development**: Agent assists with development tasks
- **Documentation**: Agent can help with README and docs

## 🚀 **Advanced Usage**

### **Custom File Analysis**
```typescript
const task: AgentTask = {
  id: 'custom-task',
  description: 'Analyze specific files for performance issues',
  files: ['src/utils/performance.ts', 'src/services/api.ts']
};
```

### **Batch Operations**
```typescript
// Process multiple tasks
const tasks = [
  { description: 'Add error handling to API endpoints' },
  { description: 'Optimize database queries' },
  { description: 'Update documentation' }
];
```

## 🔮 **Future Enhancements**

- **Multi-repo support**: Work across multiple repositories
- **Team collaboration**: Shared agent configurations
- **Advanced analysis**: Performance, security, and quality metrics
- **Integration plugins**: VS Code, GitHub, GitLab integration

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open pull request**

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🔒 Remember**: This system is designed with safety first. It will never modify protected branches and always creates development branches for changes.

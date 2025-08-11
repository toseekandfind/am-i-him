#!/bin/bash

# Agent Setup Script - Run this in any local repository to set up the agent system
# This script will install dependencies and configure the agent for the current project

set -e

echo "🤖 Setting up Safe Agent for this repository..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: This directory is not a git repository"
    echo "   Please run this script from a git repository"
    exit 1
fi

# Get repository name
REPO_NAME=$(basename $(git rev-parse --show-toplevel))
echo "📁 Repository: $REPO_NAME"

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $CURRENT_BRANCH"

# Check if we're on a protected branch
PROTECTED_BRANCHES=("main" "master" "develop" "production" "staging")
for branch in "${PROTECTED_BRANCHES[@]}"; do
    if [[ "$CURRENT_BRANCH" == "$branch" ]]; then
        echo "⚠️  Warning: You're on a protected branch ($CURRENT_BRANCH)"
        echo "   The agent will not work on protected branches"
        echo "   Please switch to a development branch first:"
        echo "   git checkout -b dev/your-feature-branch"
        exit 1
    fi
done

echo "✅ Branch check passed - safe to proceed"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OpenAI API key (for both Orchestrator and Agents)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Override default models
# OPENAI_MODEL=gpt-5o           # GPT-5 for Orchestrator (high-level planning)
# OPENAI_MODEL_MINI=gpt-5o-mini # GPT-5 Mini for Agents (task execution)
EOF
    echo "✅ .env file created"
    echo "   Please edit .env and add your actual API keys"
else
    echo "✅ .env file already exists"
fi

# Check if agent system is available
if command -v npm &> /dev/null; then
    echo "📦 Checking for agent system..."
    
    # Check if we're in the agent system repository
    if [ -f "package.json" ] && grep -q "gpt5-of-mcp" package.json; then
        echo "✅ Agent system found in current repository"
        echo "   You can run: npm run agent"
    else
        echo "📋 Agent system not found in current repository"
        echo "   To use the agent system, you need to:"
        echo "   1. Clone the agent repository: git clone <agent-repo-url>"
        echo "   2. Install dependencies: npm install"
        echo "   3. Run the agent: npm run agent"
    fi
else
    echo "⚠️  npm not found - Node.js environment required for agent system"
fi

# Create .gitignore entry for .env if not exists
if [ -f .gitignore ] && ! grep -q "^\.env$" .gitignore; then
    echo "🔒 Adding .env to .gitignore for security"
    echo "" >> .gitignore
    echo "# Environment variables (contains API keys)" >> .gitignore
    echo ".env" >> .gitignore
fi

echo ""
echo "🎉 Agent setup complete for $REPO_NAME!"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env file with your API keys"
echo "   2. Switch to a development branch if not already"
echo "   3. Run the agent: npm run agent (if in agent repo)"
echo "   4. Or use the agent CLI from the agent repository"
echo ""
echo "🔒 Safety features enabled:"
echo "   • Only works on development branches"
echo "   • Never modifies protected branches"
echo "   • Creates new dev branches for changes"
echo "   • Read-only file analysis"
echo ""
echo "💡 Available commands (when agent is running):"
echo "   analyze <description> - Analyze a coding task"
echo "   commit <description> - Analyze and commit changes"
echo "   status - Show repository status"
echo "   help - Show help message"

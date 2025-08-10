# Security Guide

This document outlines the security measures implemented in this project to protect sensitive information like API keys and credentials.

## 🔒 Protected Information

### Never Commit These Files
- `.env` - Contains your actual API keys and secrets
- `.env.local` - Local environment overrides
- `*.key`, `*.pem` - Certificate and key files
- `secrets/` - Any directory containing secrets
- `config/secrets.*` - Secret configuration files

### Safe to Commit
- `env.example` - Template showing required variables (no real values)
- `src/config.ts` - Default configuration (no secrets)
- `package.json` - Dependencies and scripts
- `README.md` - Documentation and setup instructions

## 🛡️ Security Measures

### 1. Git Ignore Protection
The `.gitignore` file automatically prevents sensitive files from being tracked:
```bash
# Environment variables and secrets
.env
.env.local
.env.*.local
*.key
*.pem
secrets/
```

### 2. Pre-commit Hook
A Git pre-commit hook automatically checks for:
- `.env` files being committed
- OpenAI API keys (`sk-...`)
- Jira credentials
- Other potential secrets

### 3. Environment Variable Usage
All sensitive configuration is stored in environment variables:
```typescript
// ✅ Good - reads from environment
const apiKey = process.env.OPENAI_API_KEY;

// ❌ Bad - hardcoded secrets
const apiKey = "sk-1234567890abcdef";
```

### 4. Local Execution
- All API calls happen on your local machine
- No secrets are sent to external servers
- Data processing is local for privacy

## 🚨 Security Checklist

Before committing code, verify:

- [ ] `.env` file is not staged (`git status` should not show it)
- [ ] No API keys in source code (`grep -r "sk-" src/`)
- [ ] No credentials in configuration files
- [ ] Pre-commit hook is enabled and working
- [ ] `.gitignore` includes all sensitive file patterns

## 🔍 Verification Commands

```bash
# Check what's ignored
git status --ignored

# Verify no secrets in source
grep -r "sk-" src/ || echo "No API keys found"

# Check what would be committed
git add . && git status

# Test pre-commit hook
git commit -m "test" --no-verify
```

## 🚀 Setup Instructions

### 1. Create Environment File
```bash
cp env.example .env
```

### 2. Fill in Real Values
```bash
# Edit .env file with your actual API keys
nano .env
```

### 3. Verify Protection
```bash
# Should show .env as ignored
git status --ignored

# Should not show .env in staged files
git add . && git status
```

## 🆘 Emergency Procedures

### If You Accidentally Commit Secrets

1. **Immediate Action**
   ```bash
   git reset --soft HEAD~1  # Undo last commit
   git reset                 # Unstage all files
   ```

2. **Remove Sensitive Files**
   ```bash
   git rm --cached .env      # Remove from tracking
   echo ".env" >> .gitignore # Ensure it's ignored
   ```

3. **Rotate Keys**
   - Generate new OpenAI API key
   - Update Jira API token
   - Update `.env` file with new values

4. **Verify Clean State**
   ```bash
   git status               # Should be clean
   git log --oneline       # Check commit history
   ```

## 📚 Additional Resources

- [OpenAI API Key Management](https://platform.openai.com/account/api-keys)
- [Jira API Token Security](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Git Security Best Practices](https://git-scm.com/book/en/v2/Git-Tools-Signing-Your-Work)
- [Environment Variable Security](https://12factor.net/config)

## 🤝 Reporting Security Issues

If you discover a security vulnerability:

1. **Do not create a public issue**
2. **Email security details privately**
3. **Include steps to reproduce**
4. **Wait for acknowledgment before disclosure**

---

**Remember**: Security is everyone's responsibility. When in doubt, ask before committing sensitive information. 
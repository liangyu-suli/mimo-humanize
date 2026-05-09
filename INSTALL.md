# Mimo-Humanize - OpenCode Plugin

An iterative development plugin for OpenCode that uses MiMo-V2.5-Pro for both implementation and independent code review.

## Quick Install for Agents

If you are an AI agent reading this, follow these steps exactly:

### Step 1: Check Prerequisites

```bash
# Verify OpenCode is installed
which opencode || echo "ERROR: OpenCode not installed. User must run: curl -fsSL https://opencode.ai/install | bash"

# Verify MIMO_API_KEY is set
test -z "$MIMO_API_KEY" && echo "ERROR: MIMO_API_KEY not set. User must run: export MIMO_API_KEY=their-key"
```

### Step 2: Clone Repository

```bash
cd /tmp
git clone https://github.com/PolyArch/mimo-humanize.git
cd mimo-humanize
```

### Step 3: Run Install Script

```bash
# Install into the current project (where opencode was launched)
./scripts/install.sh --target "$(pwd)"
```

### Step 4: Verify Installation

```bash
# Check files were installed
ls -la .opencode/plugins/mimo-humanize.ts
ls -la .opencode/agents/mimo-reviewer.md
ls -la .opencode/commands/start-rlcr-loop.md
ls -la opencode.json
```

### Step 5: Clean Up

```bash
rm -rf /tmp/mimo-humanize
```

## What Gets Installed

```
your-project/
  opencode.json                     # MiMo provider config + agent definitions
  AGENTS.md                         # Project rules for agents
  .opencode/
    plugins/mimo-humanize.ts        # Core loop engine
    tools/mimo-review.ts            # Review tool
    agents/
      mimo-build.md                 # Build agent (implementation)
      mimo-plan.md                  # Planning agent
      mimo-reviewer.md              # Review agent (code review)
      plan-compliance-checker.md    # Plan validation
      draft-relevance-checker.md    # Draft validation
      plan-understanding-quiz.md    # Quiz generator
      bitlesson-selector.md         # Knowledge selector
    commands/
      start-rlcr-loop.md            # Start iterative loop
      gen-plan.md                   # Generate plan from draft
      gen-idea.md                   # Generate ideas
      refine-plan.md                # Refine plan with annotations
      cancel-rlcr-loop.md           # Cancel active loop
    skills/
      mimo-humanize/SKILL.md
      mimo-humanize-gen-plan/SKILL.md
      mimo-humanize-refine-plan/SKILL.md
      mimo-humanize-rlcr/SKILL.md
```

## How to Use

### Generate a Plan

```
/mimo-humanize:gen-plan --input docs/draft.md --output docs/plan.md
```

### Start Iterative Development

```
/mimo-humanize:start-rlcr-loop docs/plan.md
```

### Review Existing Code

```
/mimo-humanize:start-rlcr-loop --skip-impl
```

## Configuration

### API Key

Set in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export MIMO_API_KEY=your-api-key-here
```

### Provider

The install script configures the Xiaomi MiMo provider automatically:

```json
{
  "provider": {
    "xiaomi": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Xiaomi MiMo",
      "options": {
        "baseURL": "https://token-plan-sgp.xiaomimimo.com/v1",
        "apiKey": "{env:MIMO_API_KEY}"
      },
      "models": {
        "mimo-v2.5-pro": {
          "name": "MiMo-V2.5-Pro",
          "limit": { "context": 128000, "output": 32768 }
        }
      }
    }
  }
}
```

## Agent Instructions

When a user asks you to install mimo-humanize, execute these commands in order:

```bash
# 1. Clone the repo
git clone https://github.com/PolyArch/mimo-humanize.git /tmp/mimo-humanize

# 2. Run install
/tmp/mimo-humanize/scripts/install.sh --target "$(pwd)"

# 3. Clean up
rm -rf /tmp/mimo-humanize

# 4. Confirm installation
echo "Mimo-Humanize installed. Restart OpenCode to activate."
echo "Available commands:"
echo "  /mimo-humanize:start-rlcr-loop <plan.md>"
echo "  /mimo-humanize:gen-plan --input <draft.md> --output <plan.md>"
echo "  /mimo-humanize:gen-idea <topic>"
echo "  /mimo-humanize:refine-plan <plan.md>"
echo "  /mimo-humanize:cancel-rlcr-loop"
```

If the user does not have `MIMO_API_KEY` set, prompt them:

```
Please set your MiMo API key:
  export MIMO_API_KEY=your-api-key-here

Add this to ~/.zshrc or ~/.bashrc for persistence.
```

## Troubleshooting

### No active RLCR loop found

The plugin needs a running loop. Start one with:
```
/mimo-humanize:start-rlcr-loop plan.md
```

### API key not found

```bash
echo $MIMO_API_KEY
# If empty, set it:
export MIMO_API_KEY=your-key
```

### Model not available

Verify your API key works:
```bash
curl -s https://token-plan-sgp.xiaomimimo.com/v1/models \
  -H "Authorization: Bearer $MIMO_API_KEY"
```

## License

MIT

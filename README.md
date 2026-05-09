# Mimo-Humanize

An iterative development plugin for [OpenCode](https://opencode.ai) that uses MiMo-V2.5-Pro for both implementation and independent review. Creates a feedback loop where one MiMo agent implements plans and another MiMo agent independently reviews progress, ensuring quality through continuous refinement.

> The RLCR loop, goal tracking, and review architecture are model-agnostic and agent-agnostic. Any LLM can power the build and reviewer agents -- MiMo-V2.5-Pro is simply the default. Any agent framework that supports plugins or hooks can host this workflow -- OpenCode is simply the reference implementation.

**Current Version**: 0.1.0 | **[中文文档](README_zh.md)**

## Install

**Step 1: Set your API key** (skip if already set)

```bash
echo 'export MIMO_API_KEY=your-api-key-here' >> ~/.zshrc && source ~/.zshrc
```

Get your key from [Xiaomi MiMo](https://token-plan-sgp.xiaomimimo.com).

**Step 2: Install into your project**

Paste this into OpenCode and the agent will install it for you:

```
Please install mimo-humanize from https://github.com/liangyu-suli/mimo-humanize
```

Or run the one-liner yourself:

```bash
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize && /tmp/mimo-humanize/scripts/install.sh --target "$(pwd)" && rm -rf /tmp/mimo-humanize
```

**Step 3: Restart OpenCode** (required to load the plugin)

After restart, type `/mimo` to see all commands:

```
/mimo-start-rlcr-loop   Start iterative loop with MiMo review
/mimo-gen-plan          Generate plan from draft
/mimo-gen-idea          Generate ideas via parallel exploration
/mimo-refine-plan       Refine plan with annotations
/mimo-cancel-rlcr-loop  Cancel active loop
```

## How It Works

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                      RLCR Loop Architecture                     │
  └─────────────────────────────────────────────────────────────────┘

  You ──► /mimo-start-rlcr-loop plan.md
              │
              ▼
  ┌──────────────────────┐
  │   Plan Understanding │  ◄── Quiz verifies you read the plan
  │        Quiz          │
  └──────────┬───────────┘
              │
              ▼
  ┌──────────────────────┐      ┌──────────────────────┐
  │    Build Agent       │      │    Reviewer Agent    │
  │   (mimo-build)       │◄────►│   (mimo-reviewer)    │
  │                      │      │                      │
  │  • Implements tasks  │      │  • Reviews summaries │
  │  • Writes code       │      │  • Checks git diff   │
  │  • Runs tests        │      │  • [P0-9] severity   │
  │  • Writes summary    │      │  • Goal alignment    │
  └──────────┬───────────┘      └──────────┬───────────┘
              │                              │
              │   round-N-summary.md         │
              └──────────────┬───────────────┘
                             │
                             ▼
                  session.idle event
                  (plugin intercepts)
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ Issues found   │           │   COMPLETE     │
     │                │           │                │
     │ Feedback ──────┼──► Build  │ Enter code     │
     │ inject to      │    Agent  │ review phase   │
     │ session        │    fixes  │                │
     └────────────────┘           └────────┬───────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │  Final review  │
                                  │  of git diff   │
                                  │                │
                                  │  Clean? ──► Done!
                                  │  Issues? ──► Fix & re-review
                                  └────────────────┘

  Both agents: MiMo-V2.5-Pro (same model, different system prompts)
  Build agent: full read/write/bash access
  Reviewer:    read-only + git (no incentive to approve own work)
```

### Prerequisites

- [OpenCode](https://opencode.ai) installed (`curl -fsSL https://opencode.ai/install | bash`)
- MiMo-V2.5-Pro API key from Xiaomi

### Method 1: Agent Auto-Install (Recommended)

Just paste this into OpenCode and the agent will install it for you:

```
Please install mimo-humanize from https://github.com/liangyu-suli/mimo-humanize
```

Or paste this command directly:

```bash
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize && /tmp/mimo-humanize/scripts/install.sh --target "$(pwd)" && rm -rf /tmp/mimo-humanize
```

### Method 2: Manual Install

```bash
# Set API key (add to ~/.zshrc or ~/.bashrc for persistence)
export MIMO_API_KEY=your-api-key-here

# Clone and install
cd /path/to/your/project
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize
/tmp/mimo-humanize/scripts/install.sh
rm -rf /tmp/mimo-humanize
```

The install script copies all plugins, agents, commands, skills, and config into your project's `.opencode/` directory and sets up `opencode.json`.

### Install Options

```bash
# Install into a specific project
./scripts/install.sh --target ~/my-project

# Install globally (available to all projects)
./scripts/install.sh --global

# Preview what would be installed (dry run)
./scripts/install.sh --dry-run

# Uninstall from a project
./scripts/install.sh --uninstall
```

### After Installation: Restart OpenCode

**You must restart OpenCode to activate the plugin.** OpenCode loads plugins and discovers commands at startup. There is no hot-reload mechanism.

```bash
# Exit current OpenCode session (Ctrl+C or /exit)
# Then restart:
opencode
```

After restart, you can access mimo-humanize in two ways:

**Slash commands** (type `/mimo` in the TUI):
```
/mimo-start-rlcr-loop   Start iterative loop with MiMo review
/mimo-gen-plan          Generate implementation plan from draft
/mimo-gen-idea          Generate ideas via parallel exploration
/mimo-refine-plan       Process reviewer annotations on a plan
/mimo-cancel-rlcr-loop  Cancel active RLCR loop
```

**Plugin tools** (invoke via `@tool-name` or through the agent):
```
@mimo-start-rlcr-loop   Start a loop programmatically
@mimo-cancel-rlcr-loop  Cancel a loop
@mimo-status            Show current loop status
@mimo-review            Invoke code review
```

## Usage

### Workflow 1: Draft to Implementation (Full Pipeline)

The most common workflow. Start with a rough idea, end with reviewed code.

```
# Step 1: Write a draft (plain markdown describing what you want)
vim docs/draft.md

# Step 2: Generate a structured plan from the draft
/mimo-gen-plan --input docs/draft.md --output docs/plan.md

# Step 3: Review the plan, then start the RLCR loop
/mimo-start-rlcr-loop docs/plan.md

# Step 4: Work on tasks. The build agent will:
#   - Implement plan tasks
#   - Write round summaries
#   - Get reviewed by MiMo automatically
#   - Fix issues from review feedback
#   - Repeat until all acceptance criteria pass

# Step 5: Loop ends automatically when reviewer confirms completion
```

### Workflow 2: Review Existing Code

Already made changes? Get them reviewed without a full plan.

```bash
/mimo-start-rlcr-loop --skip-impl
```

This skips the implementation phase and goes directly to code review. The reviewer will check your current changes against the base branch with `[P0-9]` severity markers.

### Workflow 3: Quick Plan Generation

Generate a plan without starting implementation immediately.

```
/mimo-gen-plan --input docs/draft.md --output docs/plan.md --direct
```

The `--direct` flag skips the convergence loop between build and reviewer agents, producing a plan faster (but less refined).

### Workflow 4: Idea Exploration

Not sure how to approach a problem? Use directed-swarm exploration.

```
/mimo-gen-idea How should we handle user authentication?
```

This launches multiple parallel explore agents, each investigating from a different angle, then presents the options for you to choose from.

## Commands Reference

| Command | Description |
|---------|-------------|
| `/mimo-start-rlcr-loop [plan.md]` | Start iterative loop with MiMo review |
| `/mimo-gen-plan --input X --output Y` | Generate implementation plan from draft |
| `/mimo-gen-idea <topic>` | Generate ideas via parallel exploration |
| `/mimo-refine-plan <plan.md>` | Process reviewer annotations on a plan |
| `/mimo-cancel-rlcr-loop` | Cancel an active loop |

### start-rlcr-loop Flags

| Flag | Description |
|------|-------------|
| `--max N` | Maximum review iterations (default: 42) |
| `--full-review-round N` | Full alignment check interval (default: 5) |
| `--skip-impl` | Skip implementation, go to code review |
| `--skip-quiz` | Skip plan understanding quiz |
| `--yolo` | Skip all pre-flight checks |
| `--privacy` | Enable privacy mode (default) |

### gen-plan Flags

| Flag | Description |
|------|-------------|
| `--input <path>` | Input draft file (required) |
| `--output <path>` | Output plan file (required) |
| `--discussion` | Iterative convergence (default) |
| `--direct` | Skip convergence, generate immediately |
| `--auto-start-rlcr-if-converged` | Start loop automatically if plan converges |

## Configuration

### API Key

The API key is read from the `MIMO_API_KEY` environment variable. Set it in your shell profile:

```bash
# ~/.zshrc or ~/.bashrc
export MIMO_API_KEY=your-api-key-here
```

The `opencode.json` references it as `"{env:MIMO_API_KEY}"`.

### Provider Config

Located in `opencode.json` at the project root:

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

### Humanize Config

Three layers (lowest to highest priority):

1. **Plugin defaults**: `config/default_config.json`
2. **User config**: `~/.config/mimo-humanize/config.json`
3. **Project config**: `.mimo-humanize/config.json`

Available options:

```json
{
  "max_iterations": 42,
  "full_review_round": 5,
  "bitlesson_model": "mimo-v2.5-pro",
  "agent_teams": false,
  "gen_plan_mode": "discussion",
  "alternative_plan_language": ""
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `max_iterations` | 42 | Maximum review rounds before forced stop |
| `full_review_round` | 5 | Full alignment check every N rounds (rounds 4, 9, 14...) |
| `bitlesson_model` | mimo-v2.5-pro | Model for BitLesson selection |
| `agent_teams` | false | Enable parallel agent teams |
| `gen_plan_mode` | discussion | Plan generation mode: `discussion` or `direct` |
| `alternative_plan_language` | "" | Generate translated plan variant (e.g., "Chinese", "Korean") |

## Runtime Files

During a loop, the plugin creates:

```
.mimo-humanize/
  rlcr/<timestamp>/
    state.md                     # Loop state (YAML frontmatter)
    goal-tracker.md              # Goal tracking
    plan.md                      # Plan backup
    round-0-prompt.md            # Initial prompt
    round-0-summary.md           # First round summary
    round-0-review-result.md     # First review result
    round-1-summary.md           # Second round summary
    ...
    finalize-state.md            # Finalize phase state
    complete-state.md            # Terminal state
  bitlesson.md                   # Knowledge base
  config.json                    # Project config override
```

## Troubleshooting

### Commands not showing up after install

You must restart OpenCode after installing. OpenCode loads plugins and commands at startup - there is no hot-reload.

```bash
# Exit OpenCode, then:
opencode
```

### "No active RLCR loop found"

The plugin can't find a `state.md` in `.mimo-humanize/rlcr/`. Make sure you started a loop with `/mimo-start-rlcr-loop`.

### API key not found

Verify your environment variable is set:

```bash
echo $MIMO_API_KEY
```

If empty, add `export MIMO_API_KEY=your-key` to your shell profile and restart your terminal.

### Model not available in /models

Check that your `opencode.json` has the correct provider config and that your API key has access to MiMo-V2.5-Pro.

### Loop stuck in review

If the reviewer keeps finding issues and the loop won't end:

1. Check the review results in `.mimo-humanize/rlcr/<timestamp>/round-N-review-result.md`
2. Address the issues or decide they're acceptable
3. Use `/mimo-cancel-rlcr-loop` to force stop if needed

## Relationship to Humanize

This project is a port of [PolyArch/humanize](https://github.com/PolyArch/humanize) adapted for OpenCode:

| Humanize (Claude Code) | Mimo-Humanize (OpenCode) |
|------------------------|--------------------------|
| Claude (Anthropic) | MiMo-V2.5-Pro (Xiaomi) |
| OpenAI Codex | MiMo-V2.5-Pro (Xiaomi) |
| Bash hooks (.sh) | TypeScript plugin (.ts) |
| `.humanize/` runtime | `.mimo-humanize/` runtime |
| `CLAUDE.md` project rules | `AGENTS.md` project rules |

## Credits

This project would not exist without [PolyArch/humanize](https://github.com/PolyArch/humanize) by **PolyArch**. The original Humanize plugin introduced the RLCR (Reinforcement Learning with Code Review) loop concept for Claude Code, creating an iterative feedback loop where one AI agent implements code and another independently reviews it.

Mimo-Humanize is a faithful port of this architecture to OpenCode, adapting the core concepts:
- The two-agent review loop
- Goal tracking to prevent drift
- BitLesson knowledge capture
- Plan generation with convergence
- The full command/skill/agent system

All credit for the RLCR methodology, loop design, and iterative development workflow goes to the original Humanize project. We are grateful to PolyArch for open-sourcing this work under the MIT license.

**Original repository:** https://github.com/PolyArch/humanize

## License

MIT

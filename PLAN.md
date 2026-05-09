# Mimo-Humanize Refactor Plan

## Overview

Refactor the [PolyArch/humanize](https://github.com/PolyArch/humanize) Claude Code plugin into an OpenCode plugin using MiMo-V2.5-Pro (Xiaomi API) for both implementation and review agents.

## Architecture Decision

| Aspect | Original (humanize) | Refactored (mimo-humanize) |
|--------|---------------------|----------------------------|
| Platform | Claude Code plugin | OpenCode plugin |
| Implementation agent | Claude (Anthropic) | MiMo-V2.5-Pro (Xiaomi) |
| Review agent | OpenAI GPT (OpenAI) | MiMo-V2.5-Pro (Xiaomi) |
| Plugin system | `.claude-plugin/` + Bash hooks | `.opencode/plugins/` + JS/TS |
| Language | Bash (~15K lines) + Python (1 file) | TypeScript (plugin) + Bash (utilities) |
| Hook model | `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit` | `tool.execute.before/after`, `session.idle`, event system |

## Two-Agent Strategy

Both agents use MiMo-V2.5-Pro but with **different system prompts** to create independent perspectives:

- **Build agent**: Implementation-focused, full tool access, executes plan tasks
- **Reviewer agent**: Read-only, code review focused, evaluates work against acceptance criteria

The different system prompts and permission sets create functional diversity even with the same underlying model.

## MiMo-V2.5-Pro Provider Configuration

```json
{
  "provider": {
    "xiaomi": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Xiaomi MiMo",
      "options": {
        "baseURL": "https://api.xiaomi.com/v1"
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

## Implementation Phases

### Phase 1: Foundation (Provider + Plugin Skeleton)

**Goal**: Get MiMo-V2.5-Pro working in OpenCode with basic agent config.

1. Create `opencode.json` with Xiaomi provider config -- DONE
2. Create plugin skeleton `.opencode/plugins/mimo-humanize.ts`
   - Subscribe to `session.idle`, `tool.execute.before`, `tool.execute.after` events
   - Implement state directory management (`.mimo-humanize/rlcr/<timestamp>/`)
3. Create base agents:
   - `.opencode/agents/mimo-build.md` -- primary build agent
   - `.opencode/agents/mimo-plan.md` -- planning agent (read-only)
   - `.opencode/agents/mimo-reviewer.md` -- code review subagent
4. Verify MiMo model works through OpenCode (`/models`, test prompt)

### Phase 2: Core Loop Engine

**Goal**: Port the RLCR loop from Bash to TypeScript.

1. **Port RLCR loop engine** to `mimo-humanize.ts` plugin:
   - `session.idle` event replaces Claude Code's `Stop` hook
   - When session becomes idle, check if round summary exists
   - If summary exists, invoke reviewer agent via `client` SDK or custom tool
   - If reviewer finds issues, inject feedback and resume session
   - If reviewer outputs "COMPLETE", transition to review phase
2. **Create `mimo-review.ts` custom tool** (`.opencode/tools/mimo-review.ts`):
   - Accepts round summary content
   - Calls MiMo API with reviewer system prompt
   - Returns structured review result (COMPLETE / issues list)
3. **Port template engine** to JS:
   - `{{VAR}}` substitution using template literals or a simple replacer function
   - Load templates from `prompt-template/` directory
4. **Port validators** as `tool.execute.before` hooks:
   - Block writes to protected files (state files, prompt files)
   - Block dangerous bash commands during active loop
   - Validate edits to goal-tracker immutable sections

### Phase 3: Commands, Skills, and Agent Definitions

**Goal**: Port all user-facing interfaces.

1. **Port 5 commands** to `.opencode/commands/`:
   - `start-rlcr-loop.md` -- plan compliance pre-check, quiz, setup
   - `gen-plan.md` -- draft-to-plan with MiMo convergence loop
   - `gen-idea.md` -- directed-swarm exploration
   - `refine-plan.md` -- process reviewer annotations
   - `cancel-rlcr-loop.md` -- cancel active loop
2. **Port 4 skills** to `.opencode/skills/`:
   - `mimo-humanize/SKILL.md` -- general humanize instructions
   - `mimo-humanize-gen-plan/SKILL.md` -- plan generation workflow
   - `mimo-humanize-refine-plan/SKILL.md` -- plan refinement workflow
   - `mimo-humanize-rlcr/SKILL.md` -- RLCR loop workflow
3. **Port agent definitions**:
   - `plan-compliance-checker.md` -- checks plan relevance
   - `draft-relevance-checker.md` -- checks draft relevance
   - `plan-understanding-quiz.md` -- generates understanding quiz
   - `bitlesson-selector.md` -- selects relevant BitLesson entries

### Phase 4: Utilities and Monitor

**Goal**: Port supporting infrastructure.

1. **Adapt monitor dashboard** (`scripts/humanize.sh`) -- keep as standalone Bash, adapt paths
2. **Port config system** (4-layer merge: defaults -> user -> project -> CLI) to JS in plugin
3. **Port BitLesson system** -- `.mimo-humanize/bitlesson.md` with selector agent
4. **Adapt setup/cancel scripts** -- update paths from `.humanize/` to `.mimo-humanize/`

### Phase 5: Testing and Documentation

**Goal**: Ensure reliability and usability.

1. Port test suite to work with new architecture
2. Write README.md with installation and usage instructions
3. Create `config/default_config.json`
4. Validate end-to-end RLCR loop manually

## Key Mapping: Claude Code to OpenCode

| Claude Code Concept | OpenCode Equivalent | Notes |
|---------------------|---------------------|-------|
| `Stop` hook | `session.idle` event | Core loop trigger |
| `PreToolUse` hook | `tool.execute.before` | Validator hooks |
| `PostToolUse` hook | `tool.execute.after` | Post-action hooks |
| `UserPromptSubmit` hook | Plugin event subscription | Input validation |
| External review CLI | Custom tool (JS) | Calls MiMo API directly |
| `.claude/commands/` | `.opencode/commands/` | Markdown slash commands |
| `.claude/skills/` | `.opencode/skills/` | SKILL.md definitions |
| `.claude/agents/` | `.opencode/agents/` | Agent definitions |
| `CLAUDE.md` | `AGENTS.md` | Project rules |
| `.humanize/` runtime dir | `.mimo-humanize/` runtime dir | State, plans, summaries |
| `ask-review.sh` (original) | `mimo-review.ts` tool | Review invocation |

## Critical Challenge: Stop Hook Replacement

The **Stop hook** is the heart of the original humanize. In Claude Code, when the agent tries to stop, the hook fires and can send work to the reviewer for review, then inject feedback to continue the loop.

In OpenCode:
- `session.idle` fires when the agent finishes responding
- The plugin can then read the session state and invoke the reviewer
- If review finds issues, the plugin can inject a new message via `client` SDK or use `tui.command.execute` to send feedback
- State management moves from Bash signal files to JS objects + filesystem

This is the **highest-risk component** and should be prototyped first in Phase 2.

## Runtime Directory Structure

```
.mimo-humanize/
  rlcr/<timestamp>/
    state.md              # Loop state (YAML frontmatter)
    goal-tracker.md       # Goal tracking (immutable + mutable sections)
    plan.md               # Plan backup
    round-N-prompt.md     # Instructions for round N
    round-N-summary.md    # Build agent's work summary
    round-N-review-result.md  # Reviewer's output
    round-N-contract.md   # Round objective contract
    finalize-state.md     # Finalize phase state
    complete-state.md     # Terminal state
  bitlesson.md            # Project knowledge base
  config.json             # Project-level config
```

## File Inventory to Create

### Config
- [x] `opencode.json` -- OpenCode config with Xiaomi provider
- [x] `AGENTS.md` -- Project rules
- [ ] `config/default_config.json` -- Default humanize config

### Plugin
- [ ] `.opencode/plugins/mimo-humanize.ts` -- Core plugin (loop engine)

### Tools
- [ ] `.opencode/tools/mimo-review.ts` -- MiMo review custom tool

### Agents (primary)
- [ ] `.opencode/agents/mimo-build.md` -- Build agent
- [ ] `.opencode/agents/mimo-plan.md` -- Plan agent
- [ ] `.opencode/agents/mimo-reviewer.md` -- Reviewer subagent

### Agents (support)
- [ ] `.opencode/agents/plan-compliance-checker.md`
- [ ] `.opencode/agents/draft-relevance-checker.md`
- [ ] `.opencode/agents/plan-understanding-quiz.md`
- [ ] `.opencode/agents/bitlesson-selector.md`

### Commands
- [ ] `.opencode/commands/mimo-start-rlcr-loop.md`
- [ ] `.opencode/commands/mimo-gen-plan.md`
- [ ] `.opencode/commands/mimo-gen-idea.md`
- [ ] `.opencode/commands/mimo-refine-plan.md`
- [ ] `.opencode/commands/mimo-cancel-rlcr-loop.md`

### Skills
- [ ] `.opencode/skills/mimo-humanize/SKILL.md`
- [ ] `.opencode/skills/mimo-humanize-gen-plan/SKILL.md`
- [ ] `.opencode/skills/mimo-humanize-refine-plan/SKILL.md`
- [ ] `.opencode/skills/mimo-humanize-rlcr/SKILL.md`

### Templates (copied from humanize, adapted)
- [ ] `prompt-template/block/*.md` -- Blocking message templates
- [ ] `prompt-template/mimo/*.md` -- MiMo reviewer prompts
- [ ] `prompt-template/build/*.md` -- Build agent prompts (replaces claude/)
- [ ] `prompt-template/plan/*.md` -- Plan generation templates
- [ ] `prompt-template/idea/*.md` -- Idea generation templates
- [ ] `templates/bitlesson.md` -- BitLesson template

### Scripts (adapted from humanize)
- [ ] `scripts/humanize.sh` -- Monitor dashboard
- [ ] `scripts/setup-rlcr-loop.sh` -- Loop initialization
- [ ] `scripts/cancel-rlcr-loop.sh` -- Loop cancellation
- [ ] `scripts/lib/config-loader.sh` -- Config merge system
- [ ] `scripts/lib/monitor-common.sh` -- Monitor helpers

### Documentation
- [ ] `README.md` -- Installation and usage guide

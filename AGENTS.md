# Mimo-Humanize

An iterative development plugin for OpenCode that uses MiMo-V2.5-Pro for both implementation and independent review. Creates a feedback loop where one MiMo agent implements plans and another MiMo agent independently reviews progress, ensuring quality through continuous refinement.

## Project Rules

- Everything about this project, including implementations, comments, tests and documentation should be in English. No Emoji or CJK characters are allowed.
- If version bump is required, bump in `opencode.json` and `README.md`.
- Version number must be in format `X.Y.Z` where X/Y/Z are numeric.
- The plan template in `commands/gen-plan.md` and `prompt-template/plan/gen-plan-template.md` must stay in sync.

## Architecture

This is an OpenCode plugin (JS/TS) that provides:
- RLCR loop (Reinforcement Learning with Code Review) via OpenCode plugin events
- MiMo-V2.5-Pro as both implementation and review model
- Goal tracking system to prevent drift
- BitLesson knowledge capture system
- Plan generation with iterative convergence

## Key Directories

- `.opencode/plugins/` - Core plugin (JS/TS)
- `.opencode/agents/` - Agent definitions (markdown)
- `.opencode/skills/` - Skill definitions
- `.opencode/commands/` - Slash commands
- `.opencode/tools/` - Custom tools
- `scripts/` - Bash utilities (monitor, setup)
- `prompt-template/` - Prompt templates
- `config/` - Default configuration

## Commands

- `/mimo-start-rlcr-loop` - Start iterative loop with MiMo review
- `/mimo-gen-plan` - Generate implementation plan from draft
- `/mimo-gen-idea` - Generate ideas via directed-swarm exploration
- `/mimo-refine-plan` - Process reviewer annotations
- `/mimo-cancel-rlcr-loop` - Cancel active loop

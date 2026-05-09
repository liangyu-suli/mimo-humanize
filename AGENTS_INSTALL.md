# Mimo-Humanize Install Guide (Agent-Readable)

## For AI Agents

When a user asks to install mimo-humanize, run these commands:

```bash
# Clone
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize

# Install into current project
/tmp/mimo-humanize/scripts/install.sh --target "$(pwd)"

# Clean up
rm -rf /tmp/mimo-humanize
```

## Prerequisites Check

Before installing, verify:

```bash
# OpenCode installed?
command -v opencode

# API key set?
echo $MIMO_API_KEY
```

If `MIMO_API_KEY` is empty, tell user:
```
Set your API key: export MIMO_API_KEY=your-key
Add to ~/.zshrc for persistence.
```

## Post-Install

Tell user to restart OpenCode, then:

```
/mimo-humanize:start-rlcr-loop plan.md
/mimo-humanize:gen-plan --input draft.md --output plan.md
```

## What It Does

- Build agent (MiMo-V2.5-Pro) implements code
- Reviewer agent (MiMo-V2.5-Pro) checks work
- Iterates until acceptance criteria met
- Goal tracking prevents drift
- BitLesson captures project knowledge

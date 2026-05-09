#!/usr/bin/env bash
#
# Install Mimo-Humanize for OpenCode
#
# Usage:
#   ./scripts/install.sh [options]
#
# Options:
#   --target PATH    Project directory to install into (default: current directory)
#   --global         Install globally (~/.config/opencode/)
#   --uninstall      Remove mimo-humanize from target
#   --dry-run        Print actions without writing
#   -h, --help       Show help
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET=""
GLOBAL="false"
UNINSTALL="false"
DRY_RUN="false"

usage() {
    cat <<'EOF'
Install Mimo-Humanize for OpenCode

Usage:
  ./scripts/install.sh [options]

Options:
  --target PATH    Project directory to install into (default: current directory)
  --global         Install globally (~/.config/opencode/)
  --uninstall      Remove mimo-humanize from target
  --dry-run        Print actions without writing
  -h, --help       Show help

Examples:
  # Install into current project
  ./scripts/install.sh

  # Install into a specific project
  ./scripts/install.sh --target ~/my-project

  # Install globally (available to all projects)
  ./scripts/install.sh --global

  # Uninstall from current project
  ./scripts/install.sh --uninstall
EOF
}

log() {
    printf '[mimo-humanize] %s\n' "$*"
}

die() {
    printf '[mimo-humanize] Error: %s\n' "$*" >&2
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET="$2"
            shift 2
            ;;
        --global)
            GLOBAL="true"
            shift
            ;;
        --uninstall)
            UNINSTALL="true"
            shift
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            die "Unknown option: $1. Use --help for usage."
            ;;
    esac
done

# Resolve target directory
if [[ "$GLOBAL" == "true" ]]; then
    TARGET="${HOME}/.config/opencode"
else
    TARGET="${TARGET:-$(pwd)}"
fi

# Validate target
if [[ ! -d "$TARGET" ]]; then
    die "Target directory does not exist: $TARGET"
fi

# For project installs, check it looks like a project
if [[ "$GLOBAL" == "false" ]]; then
    if [[ ! -f "$TARGET/package.json" && ! -f "$TARGET/opencode.json" && ! -d "$TARGET/.git" ]]; then
        log "Warning: Target doesn't look like a project directory (no package.json, opencode.json, or .git)"
        log "Continuing anyway..."
    fi
fi

# ========================================
# Uninstall
# ========================================

if [[ "$UNINSTALL" == "true" ]]; then
    log "Uninstalling mimo-humanize from: $TARGET"

    ITEMS_TO_REMOVE=(
        "$TARGET/.opencode/plugins/mimo-humanize.ts"
        "$TARGET/.opencode/tools/mimo-review.ts"
        "$TARGET/.opencode/agents/mimo-build.md"
        "$TARGET/.opencode/agents/mimo-plan.md"
        "$TARGET/.opencode/agents/mimo-reviewer.md"
        "$TARGET/.opencode/agents/plan-compliance-checker.md"
        "$TARGET/.opencode/agents/draft-relevance-checker.md"
        "$TARGET/.opencode/agents/plan-understanding-quiz.md"
        "$TARGET/.opencode/agents/bitlesson-selector.md"
        "$TARGET/.opencode/commands/mimo-start-rlcr-loop.md"
        "$TARGET/.opencode/commands/mimo-gen-plan.md"
        "$TARGET/.opencode/commands/mimo-gen-idea.md"
        "$TARGET/.opencode/commands/mimo-refine-plan.md"
        "$TARGET/.opencode/commands/mimo-cancel-rlcr-loop.md"
        "$TARGET/.opencode/skills/mimo-humanize/SKILL.md"
        "$TARGET/.opencode/skills/mimo-humanize-gen-plan/SKILL.md"
        "$TARGET/.opencode/skills/mimo-humanize-refine-plan/SKILL.md"
        "$TARGET/.opencode/skills/mimo-humanize-rlcr/SKILL.md"
    )

    for item in "${ITEMS_TO_REMOVE[@]}"; do
        if [[ -f "$item" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                log "[dry-run] Would remove: $item"
            else
                rm "$item"
                log "Removed: $item"
            fi
        fi
    done

    # Remove empty directories
    for dir in "$TARGET/.opencode/skills/mimo-humanize" "$TARGET/.opencode/skills/mimo-humanize-gen-plan" "$TARGET/.opencode/skills/mimo-humanize-refine-plan" "$TARGET/.opencode/skills/mimo-humanize-rlcr"; do
        if [[ -d "$dir" ]] && [[ -z "$(ls -A "$dir" 2>/dev/null)" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                log "[dry-run] Would remove empty dir: $dir"
            else
                rmdir "$dir"
                log "Removed empty dir: $dir"
            fi
        fi
    done

    log "Uninstall complete."
    log "Note: .mimo-humanize/ runtime directory was NOT removed (contains your loop data)."
    log "Note: opencode.json was NOT modified (remove xiaomi provider manually if needed)."
    exit 0
fi

# ========================================
# Install
# ========================================

log "Installing mimo-humanize to: $TARGET"

# Create directories
DIRS=(
    "$TARGET/.opencode/plugins"
    "$TARGET/.opencode/tools"
    "$TARGET/.opencode/agents"
    "$TARGET/.opencode/commands"
    "$TARGET/.opencode/skills/mimo-humanize"
    "$TARGET/.opencode/skills/mimo-humanize-gen-plan"
    "$TARGET/.opencode/skills/mimo-humanize-refine-plan"
    "$TARGET/.opencode/skills/mimo-humanize-rlcr"
)

for dir in "${DIRS[@]}"; do
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] Would create dir: $dir"
    else
        mkdir -p "$dir"
    fi
done

# Copy files
copy_file() {
    local src="$1"
    local dst="$2"
    if [[ ! -f "$src" ]]; then
        log "Warning: Source not found: $src"
        return
    fi
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] Would copy: $src -> $dst"
    else
        cp "$src" "$dst"
        log "Installed: $dst"
    fi
}

# Plugin
copy_file "$REPO_ROOT/.opencode/plugins/mimo-humanize.ts" "$TARGET/.opencode/plugins/mimo-humanize.ts"

# Tools
copy_file "$REPO_ROOT/.opencode/tools/mimo-review.ts" "$TARGET/.opencode/tools/mimo-review.ts"

# Agents
for agent in mimo-build mimo-plan mimo-reviewer plan-compliance-checker draft-relevance-checker plan-understanding-quiz bitlesson-selector; do
    copy_file "$REPO_ROOT/.opencode/agents/${agent}.md" "$TARGET/.opencode/agents/${agent}.md"
done

# Commands
for cmd in mimo-start-rlcr-loop mimo-gen-plan mimo-gen-idea mimo-refine-plan mimo-cancel-rlcr-loop; do
    copy_file "$REPO_ROOT/.opencode/commands/${cmd}.md" "$TARGET/.opencode/commands/${cmd}.md"
done

# Skills
for skill in mimo-humanize mimo-humanize-gen-plan mimo-humanize-refine-plan mimo-humanize-rlcr; do
    copy_file "$REPO_ROOT/.opencode/skills/${skill}/SKILL.md" "$TARGET/.opencode/skills/${skill}/SKILL.md"
done

# Merge opencode.json (provider + agent config + commands)
if [[ -f "$TARGET/opencode.json" ]]; then
    if command -v jq &>/dev/null; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log "[dry-run] Would merge xiaomi provider into existing opencode.json"
        else
            # Backup existing config
            cp "$TARGET/opencode.json" "$TARGET/opencode.json.bak"

            # Read source config
            SOURCE_CONFIG=$(cat "$REPO_ROOT/opencode.json")

            # Merge provider, agent, and command sections
            jq -s '.[0] * .[1]' "$TARGET/opencode.json" "$REPO_ROOT/opencode.json" > "$TARGET/opencode.json.tmp" && mv "$TARGET/opencode.json.tmp" "$TARGET/opencode.json"

            log "Merged mimo-humanize config into existing opencode.json (backup: opencode.json.bak)"
        fi
    else
        log "Warning: jq not installed. Cannot merge into existing opencode.json."
        log "Install jq: brew install jq"
        log "Or manually add the xiaomi provider section from:"
        log "  $REPO_ROOT/opencode.json"
    fi
else
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] Would copy opencode.json"
    else
        cp "$REPO_ROOT/opencode.json" "$TARGET/opencode.json"
        log "Installed: opencode.json"
    fi
fi

# Copy AGENTS.md
if [[ -f "$TARGET/AGENTS.md" ]]; then
    log "Existing AGENTS.md found. Skipping."
else
    if [[ "$DRY_RUN" == "true" ]]; then
        log "[dry-run] Would copy AGENTS.md"
    else
        cp "$REPO_ROOT/AGENTS.md" "$TARGET/AGENTS.md"
        log "Installed: AGENTS.md"
    fi
fi

# Check API key
if [[ -z "${MIMO_API_KEY:-}" ]]; then
    log ""
    log "WARNING: MIMO_API_KEY environment variable is not set."
    log "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
    log "  export MIMO_API_KEY=your-api-key-here"
    log ""
else
    log "MIMO_API_KEY is set (ends with: ...${MIMO_API_KEY: -4})"
fi

log ""
log "Install complete!"
log ""
log "============================================"
log "  RESTART OPENCODE to activate commands"
log "============================================"
log ""
log "Available commands after restart:"
log "  /mimo-start-rlcr-loop  - Start iterative loop"
log "  /mimo-gen-plan         - Generate plan from draft"
log "  /mimo-gen-idea         - Generate ideas"
log "  /mimo-refine-plan      - Refine plan annotations"
log "  /mimo-cancel-rlcr-loop - Cancel active loop"
log ""
log "Or use the plugin tools (immediate after restart):"
log "  @mimo-start-rlcr-loop  - Start loop via tool"
log "  @mimo-cancel-rlcr-loop - Cancel loop via tool"
log "  @mimo-status           - Show loop status"
log "  @mimo-review           - Invoke code review"
log ""

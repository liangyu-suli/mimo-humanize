/**
 * Mimo-Humanize Plugin for OpenCode
 *
 * Implements the RLCR (Reinforcement Learning with Code Review) loop.
 * Uses MiMo-V2.5-Pro for both implementation and independent review.
 *
 * Core mechanism:
 * 1. User starts a loop via mimo-start-rlcr-loop command/tool
 * 2. Build agent implements plan tasks
 * 3. When session goes idle (agent finishes a round), the plugin:
 *    a. Reads the round summary
 *    b. Invokes the reviewer agent via the SDK
 *    c. If issues found, injects feedback and the session continues
 *    d. If COMPLETE, transitions to code review phase
 * 4. In code review phase, reviewer checks code quality
 * 5. When all clear, loop finalizes
 *
 * State management: .mimo-humanize/rlcr/<timestamp>/
 */

import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "fs"
import { join, resolve } from "path"
import { homedir } from "os"

// ========================================
// Constants
// ========================================

const RUNTIME_DIR = ".mimo-humanize"
const RLCR_DIR = join(RUNTIME_DIR, "rlcr")
const STATE_FILE = "state.md"
const GOAL_TRACKER_FILE = "goal-tracker.md"
const ROUND_SUMMARY_PATTERN = /^round-(\d+)-summary\.md$/
const ROUND_REVIEW_PATTERN = /^round-(\d+)-review-result\.md$/
const COMPLETE_MARKER = "MARKER_COMPLETE"

const DEFAULT_MAX_ITERATIONS = 42
const DEFAULT_FULL_REVIEW_ROUND = 5

// ========================================
// Types
// ========================================

interface LoopState {
  currentRound: number
  maxIterations: number
  planFile: string
  planTracked: boolean
  startBranch: string
  baseBranch: string
  baseCommit: string
  pushEveryRound: boolean
  fullReviewRound: number
  reviewStarted: boolean
  mainlineStallCount: number
  lastMainlineVerdict: string
  driftStatus: string
  privacyMode: boolean
}

interface ReviewResult {
  complete: boolean
  issues: string[]
  summary: string
  raw: string
}

// ========================================
// Template Engine
// ========================================

function loadTemplate(templatePath: string, vars: Record<string, string>): string {
  if (!existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`)
  }
  let content = readFileSync(templatePath, "utf-8")
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value)
  }
  return content
}

// ========================================
// State File Parser
// ========================================

function parseStateFile(filePath: string): LoopState | null {
  if (!existsSync(filePath)) return null

  const content = readFileSync(filePath, "utf-8")
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!frontmatterMatch) return null

  const lines = frontmatterMatch[1].split("\n")
  const fields: Record<string, string> = {}

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      fields[match[1]] = match[2].replace(/^["']|["']$/g, "").trim()
    }
  }

  return {
    currentRound: parseInt(fields.current_round || "0", 10),
    maxIterations: parseInt(fields.max_iterations || String(DEFAULT_MAX_ITERATIONS), 10),
    planFile: fields.plan_file || "",
    planTracked: fields.plan_tracked === "true",
    startBranch: fields.start_branch || "",
    baseBranch: fields.base_branch || "",
    baseCommit: fields.base_commit || "",
    pushEveryRound: fields.push_every_round === "true",
    fullReviewRound: parseInt(fields.full_review_round || String(DEFAULT_FULL_REVIEW_ROUND), 10),
    reviewStarted: fields.review_started === "true",
    mainlineStallCount: parseInt(fields.mainline_stall_count || "0", 10),
    lastMainlineVerdict: fields.last_mainline_verdict || "unknown",
    driftStatus: fields.drift_status || "normal",
    privacyMode: fields.privacy_mode !== "false",
  }
}

function writeStateFile(filePath: string, state: LoopState): void {
  const content = `---
current_round: ${state.currentRound}
max_iterations: ${state.maxIterations}
plan_file: "${state.planFile}"
plan_tracked: ${state.planTracked}
start_branch: "${state.startBranch}"
base_branch: "${state.baseBranch}"
base_commit: "${state.baseCommit}"
push_every_round: ${state.pushEveryRound}
full_review_round: ${state.fullReviewRound}
review_started: ${state.reviewStarted}
mainline_stall_count: ${state.mainlineStallCount}
last_mainline_verdict: "${state.lastMainlineVerdict}"
drift_status: "${state.driftStatus}"
privacy_mode: ${state.privacyMode}
---

# RLCR Loop State

Current Round: ${state.currentRound}
Max Iterations: ${state.maxIterations}
Plan File: ${state.planFile}
Review Phase: ${state.reviewStarted ? "active" : "implementation"}
`
  writeFileSync(filePath, content, "utf-8")
}

// ========================================
// Loop Directory Management
// ========================================

function findActiveLoop(projectRoot: string): string | null {
  const rlcrDir = join(projectRoot, RLCR_DIR)
  if (!existsSync(rlcrDir)) return null

  const dirs = readdirSync(rlcrDir)
    .filter((d) => statSync(join(rlcrDir, d)).isDirectory())
    .sort()
    .reverse()

  for (const dir of dirs) {
    const loopDir = join(rlcrDir, dir)
    const stateFilePath = join(loopDir, STATE_FILE)
    const completePath = join(loopDir, "complete-state.md")

    // Active loop = has state file and no complete marker
    if (existsSync(stateFilePath) && !existsSync(completePath)) {
      return loopDir
    }
  }

  return null
}

function createLoopDir(projectRoot: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const loopDir = join(projectRoot, RLCR_DIR, timestamp)
  mkdirSync(loopDir, { recursive: true })
  return loopDir
}

// ========================================
// Round Summary Detection
// ========================================

function findLatestRoundSummary(loopDir: string): { round: number; path: string; content: string } | null {
  const files = readdirSync(loopDir)
  let latestRound = -1
  let latestPath = ""

  for (const file of files) {
    const match = file.match(ROUND_SUMMARY_PATTERN)
    if (match) {
      const round = parseInt(match[1], 10)
      if (round > latestRound) {
        latestRound = round
        latestPath = join(loopDir, file)
      }
    }
  }

  if (latestRound >= 0 && existsSync(latestPath)) {
    return {
      round: latestRound,
      path: latestPath,
      content: readFileSync(latestPath, "utf-8"),
    }
  }

  return null
}

function hasReviewResult(loopDir: string, round: number): boolean {
  const reviewPath = join(loopDir, `round-${round}-review-result.md`)
  return existsSync(reviewPath)
}

// ========================================
// Review Result Parser
// ========================================

function parseReviewResult(content: string): ReviewResult {
  const hasComplete = content.includes(COMPLETE_MARKER)
  const issuePattern = /\[P(\d)-(\d)\]\s*(.+?)(?:\n|$)/g
  const issues: string[] = []
  let match

  while ((match = issuePattern.exec(content)) !== null) {
    issues.push(match[0].trim())
  }

  return {
    complete: hasComplete,
    issues,
    summary: content.slice(0, 500),
    raw: content,
  }
}

// ========================================
// Config Loader
// ========================================

function loadConfig(projectRoot: string): Record<string, any> {
  const defaults: Record<string, any> = {
    max_iterations: 42,
    full_review_round: 5,
    bitlesson_model: "mimo-v2.5-pro",
    agent_teams: false,
    gen_plan_mode: "discussion",
    alternative_plan_language: "",
  }

  let config = { ...defaults }

  const userConfigPath = join(homedir(), ".config", "mimo-humanize", "config.json")
  if (existsSync(userConfigPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(userConfigPath, "utf-8"))
      config = { ...config, ...userConfig }
    } catch {}
  }

  const projectConfigPath = join(projectRoot, RUNTIME_DIR, "config.json")
  if (existsSync(projectConfigPath)) {
    try {
      const projectConfig = JSON.parse(readFileSync(projectConfigPath, "utf-8"))
      config = { ...config, ...projectConfig }
    } catch {}
  }

  return config
}

// ========================================
// Protected Files (Validator)
// ========================================

const PROTECTED_PATTERNS = [
  /\.mimo-humanize\/.*\/state\.md$/,
  /\.mimo-humanize\/.*\/goal-tracker\.md$/,
  /\.mimo-humanize\/.*\/round-\d+-prompt\.md$/,
  /\.mimo-humanize\/.*\/finalize-state\.md$/,
  /\.mimo-humanize\/.*\/complete-state\.md$/,
]

const DANGEROUS_BASH_PATTERNS = [
  /\brm\s+-rf?\s+\.\//,
  /\bgit\s+push\b.*--force/,
  /\bgit\s+reset\b.*--hard/,
  /\bgit\s+checkout\b.*--force/,
]

// ========================================
// Plugin Export
// ========================================

export const MimoHumanize: Plugin = async ({ project, client, $, directory, worktree }) => {
  const projectRoot = worktree || directory
  const pluginRoot = join(projectRoot, ".opencode")

  let activeLoopDir: string | null = null
  let activeState: LoopState | null = null
  let isProcessingReview = false

  console.log("[mimo-humanize] Plugin initialized")

  return {
    // ------------------------------------
    // Custom Tools (Commands)
    // ------------------------------------
    // These are available immediately when the plugin loads.
    // Users can invoke them via @tool-name or through the agent.

    tool: {
      "mimo-start-rlcr-loop": tool({
        description: "Start an RLCR (Reinforcement Learning with Code Review) iterative loop with MiMo review. Usage: mimo-start-rlcr-loop <plan.md> [--max N] [--skip-impl] [--skip-quiz]",
        args: {
          plan_file: tool.schema.string().optional().describe("Path to the plan file (e.g., docs/plan.md). Omit if using --skip-impl."),
          max_iterations: tool.schema.number().optional().describe("Maximum review iterations (default: 42)"),
          skip_impl: tool.schema.boolean().optional().describe("Skip implementation phase, go directly to code review"),
          skip_quiz: tool.schema.boolean().optional().describe("Skip plan understanding quiz"),
        },
        async execute(args, context) {
          const { directory, worktree } = context
          const root = worktree || directory

          // Create loop directory
          const loopDir = createLoopDir(root)

          // Get current git branch
          let startBranch = "unknown"
          let baseBranch = "main"
          try {
            startBranch = await $`git -C ${root} rev-parse --abbrev-ref HEAD`.text().then(s => s.trim())
            baseBranch = await $`git -C ${root} symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"`.text().then(s => s.trim().replace("refs/remotes/origin/", ""))
          } catch {}

          // Copy plan file if provided
          let planFile = ""
          if (args.plan_file) {
            const planPath = join(root, args.plan_file)
            if (existsSync(planPath)) {
              const planContent = readFileSync(planPath, "utf-8")
              writeFileSync(join(loopDir, "plan.md"), planContent, "utf-8")
              planFile = args.plan_file
            } else {
              return `Error: Plan file not found: ${args.plan_file}`
            }
          }

          // Initialize state
          const state: LoopState = {
            currentRound: 0,
            maxIterations: args.max_iterations || DEFAULT_MAX_ITERATIONS,
            planFile,
            planTracked: !!planFile,
            startBranch,
            baseBranch,
            baseCommit: "",
            pushEveryRound: false,
            fullReviewRound: DEFAULT_FULL_REVIEW_ROUND,
            reviewStarted: args.skip_impl || false,
            mainlineStallCount: 0,
            lastMainlineVerdict: "unknown",
            driftStatus: "normal",
            privacyMode: true,
          }

          writeStateFile(join(loopDir, STATE_FILE), state)

          // Initialize goal tracker
          const goalTrackerContent = `# Goal Tracker

## IMMUTABLE (Do not modify)

### Ultimate Goal
${planFile ? "Implement the plan: " + planFile : "Code review mode (--skip-impl)"}

### Acceptance Criteria
To be defined during implementation.

## MUTABLE

### Active Tasks
- [ ] Define tasks from plan

### Completed Items
(none)

### Deferred Items
(none)

### Plan Evolution Log
(none)
`
          writeFileSync(join(loopDir, GOAL_TRACKER_FILE), goalTrackerContent, "utf-8")

          // Initialize bitlesson
          const bitlessonPath = join(root, RUNTIME_DIR, "bitlesson.md")
          if (!existsSync(bitlessonPath)) {
            mkdirSync(join(root, RUNTIME_DIR), { recursive: true })
            writeFileSync(bitlessonPath, `# BitLesson - Project Knowledge Base

## Entries

(none yet)

---
Format: BL-N: <problem> -> <solution>
`, "utf-8")
          }

          return `RLCR loop started!

Loop directory: ${loopDir}
Plan: ${planFile || "(none - code review mode)"}
Branch: ${startBranch}
Max iterations: ${state.maxIterations}
Review phase: ${state.reviewStarted ? "ACTIVE (skip-impl)" : "implementation"}

Next steps:
1. Work on your plan tasks
2. Write round summaries to: ${loopDir}/round-N-summary.md
3. The reviewer will automatically check your work when you finish a round
4. Use mimo-cancel-rlcr-loop to stop the loop

Goal tracker: ${loopDir}/goal-tracker.md
`
        },
      }),

      "mimo-cancel-rlcr-loop": tool({
        description: "Cancel an active RLCR loop",
        args: {
          force: tool.schema.boolean().optional().describe("Force cancel without confirmation"),
        },
        async execute(args, context) {
          const { directory, worktree } = context
          const root = worktree || directory

          const loopDir = findActiveLoop(root)
          if (!loopDir) {
            return "No active RLCR loop found."
          }

          const stateFilePath = join(loopDir, STATE_FILE)
          const cancelPath = join(loopDir, "cancel-state.md")

          if (existsSync(stateFilePath)) {
            // Rename state file to cancel
            const content = readFileSync(stateFilePath, "utf-8")
            writeFileSync(cancelPath, content.replace("---\n", "---\nstatus: cancelled\n"), "utf-8")

            try { await $`rm ${stateFilePath}` } catch {}
          }

          return `RLCR loop cancelled.

Loop directory preserved: ${loopDir}
Review results and summaries are still available for reference.
`
        },
      }),

      "mimo-status": tool({
        description: "Show current RLCR loop status",
        args: {},
        async execute(args, context) {
          const { directory, worktree } = context
          const root = worktree || directory

          const loopDir = findActiveLoop(root)
          if (!loopDir) {
            return "No active RLCR loop."
          }

          const stateFilePath = join(loopDir, STATE_FILE)
          const state = parseStateFile(stateFilePath)
          if (!state) {
            return "Loop directory found but state file is missing or corrupted."
          }

          const summary = findLatestRoundSummary(loopDir)

          return `RLCR Loop Status
================
Directory: ${loopDir}
Round: ${state.currentRound} / ${state.maxIterations}
Phase: ${state.reviewStarted ? "Code Review" : "Implementation"}
Branch: ${state.startBranch}
Plan: ${state.planFile || "(none)"}
Latest summary: ${summary ? `round-${summary.round}-summary.md` : "(none yet)"}
Goal tracker: ${join(loopDir, GOAL_TRACKER_FILE)}
`
        },
      }),

      "mimo-review": tool({
        description: "Invoke MiMo code review on a round summary or code changes",
        args: {
          summary: tool.schema.string().describe("Path to round summary file or text content to review"),
          goal_tracker: tool.schema.string().optional().describe("Path to goal-tracker.md"),
          plan: tool.schema.string().optional().describe("Path to plan.md"),
          round: tool.schema.number().optional().describe("Round number"),
          mode: tool.schema.enum(["round-review", "code-review", "ad-hoc"]).optional().describe("Review mode"),
        },
        async execute(args, context) {
          const { directory, worktree } = context
          const root = worktree || directory
          const mode = args.mode || "round-review"
          const round = args.round || 0

          let summaryContent = args.summary
          if (existsSync(args.summary)) {
            summaryContent = readFileSync(args.summary, "utf-8")
          }

          let goalTrackerContent = ""
          if (args.goal_tracker && existsSync(args.goal_tracker)) {
            goalTrackerContent = readFileSync(args.goal_tracker, "utf-8")
          }

          let planContent = ""
          if (args.plan && existsSync(args.plan)) {
            planContent = readFileSync(args.plan, "utf-8")
          }

          if (mode === "round-review") {
            return `# RLCR Round ${round} Review

## Goal Tracker
${goalTrackerContent || "No goal tracker provided."}

## Plan
${planContent || "No plan provided."}

## Round ${round} Summary
${summaryContent}

## Review Instructions

1. Check if the summary is thorough and honest
2. Check if all acceptance criteria are addressed
3. Check for signs of incomplete work
4. Verify tests were written/run

## Output

If complete: output EXACTLY "MARKER_COMPLETE" on its own line.
If issues: list with [P0-9] severity markers.
`
          } else if (mode === "code-review") {
            return `# Code Quality Review

## Code to Review
${summaryContent}

## Checklist
1. Correctness
2. Error handling
3. Edge cases
4. Security
5. Performance
6. Readability
7. Tests

For each issue: [P0-P9] severity and description.
If no issues: "No issues found."
`
          } else {
            return `# Ad-Hoc Review

## Content
${summaryContent}

Provide constructive feedback on completeness, correctness, and clarity.`
          }
        },
      }),
    },

    // ------------------------------------
    // Session Events
    // ------------------------------------

    event: async ({ event }) => {
      if (event.type === "session.idle") {
        if (isProcessingReview) return

        activeLoopDir = findActiveLoop(projectRoot)
        if (!activeLoopDir) return

        const stateFilePath = join(activeLoopDir, STATE_FILE)
        activeState = parseStateFile(stateFilePath)
        if (!activeState) return

        const summary = findLatestRoundSummary(activeLoopDir)
        if (!summary) return

        if (hasReviewResult(activeLoopDir, summary.round)) return

        isProcessingReview = true
        console.log(`[mimo-humanize] Round ${summary.round} complete, invoking reviewer...`)

        try {
          const reviewPrompt = buildReviewPrompt(summary, activeState, activeLoopDir)
          const promptPath = join(activeLoopDir, `round-${summary.round}-review-prompt.md`)
          writeFileSync(promptPath, reviewPrompt, "utf-8")

          await invokeReviewer(client, reviewPrompt, activeLoopDir, summary.round)
        } catch (err) {
          console.error(`[mimo-humanize] Review failed: ${err}`)
        } finally {
          isProcessingReview = false
        }
      }
    },

    // ------------------------------------
    // Tool Validators
    // ------------------------------------

    "tool.execute.before": async (input, output) => {
      if (!activeLoopDir) return

      if (input.tool === "write" || input.tool === "edit" || input.tool === "apply_patch") {
        const filePath = output?.args?.filePath || ""
        for (const pattern of PROTECTED_PATTERNS) {
          if (pattern.test(filePath)) {
            throw new Error(`[mimo-humanize] Blocked: cannot modify protected state file: ${filePath}`)
          }
        }
      }

      if (input.tool === "bash") {
        const command = output?.args?.command || ""
        for (const pattern of DANGEROUS_BASH_PATTERNS) {
          if (pattern.test(command)) {
            throw new Error(`[mimo-humanize] Blocked: dangerous command during active loop: ${command}`)
          }
        }
      }
    },

    "tool.execute.after": async (input, output) => {
      // Track file changes for drift detection
    },
  }
}

// ========================================
// Review Prompt Builder
// ========================================

function buildReviewPrompt(
  summary: { round: number; content: string },
  state: LoopState,
  loopDir: string
): string {
  const goalTrackerPath = join(loopDir, GOAL_TRACKER_FILE)
  const goalTracker = existsSync(goalTrackerPath)
    ? readFileSync(goalTrackerPath, "utf-8")
    : "No goal tracker found."

  const planPath = join(loopDir, "plan.md")
  const plan = existsSync(planPath)
    ? readFileSync(planPath, "utf-8")
    : "No plan file found."

  return `# RLCR Round ${summary.round} Review

## Your Role
You are an independent code reviewer for an iterative development loop.
Review the build agent's work summary and determine if the work is complete and correct.

## Loop State
- Current Round: ${summary.round}
- Max Iterations: ${state.maxIterations}
- Full Review Round: ${state.fullReviewRound}
- Review Phase: ${state.reviewStarted ? "active" : "implementation"}

## Goal Tracker
${goalTracker}

## Plan
${plan}

## Round ${summary.round} Summary
${summary.content}

## Review Instructions

1. Check if the summary is thorough and honest
2. Check if all acceptance criteria from the goal tracker are addressed
3. Check for signs of incomplete work or "glossing over" issues
4. Verify that tests were written/run where applicable

## Output Format

If the work is complete and satisfactory, output EXACTLY this marker on its own line:
${COMPLETE_MARKER}

If there are issues, list them clearly with severity markers:
- [P0-9] Issue description

Where P0 is critical, P9 is minor.

Be strict but fair. The goal is quality, not perfection.
`
}

// ========================================
// Reviewer Invocation
// ========================================

async function invokeReviewer(
  client: any,
  prompt: string,
  loopDir: string,
  round: number
): Promise<void> {
  const reviewResultPath = join(loopDir, `round-${round}-review-result.md`)

  try {
    if (client?.agent?.invoke) {
      const result = await client.agent.invoke({
        agent: "mimo-reviewer",
        prompt: prompt,
      })
      writeFileSync(reviewResultPath, result.content || result.text || String(result), "utf-8")
    } else {
      console.log(`[mimo-humanize] Review prompt written to: ${join(loopDir, `round-${round}-review-prompt.md`)}`)
      console.log(`[mimo-humanize] Invoke reviewer manually via mimo-review tool`)
    }
  } catch (err) {
    console.error(`[mimo-humanize] Failed to invoke reviewer: ${err}`)
    writeFileSync(reviewResultPath, `Review failed: ${err}\n\nPlease re-run the review.`, "utf-8")
  }
}

export default MimoHumanize

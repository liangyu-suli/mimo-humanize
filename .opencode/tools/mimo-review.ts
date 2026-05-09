/**
 * mimo-review.ts - Custom tool for invoking MiMo code review
 *
 * This tool is used by the RLCR loop to invoke the reviewer agent
 * on round summaries. It can also be used standalone for ad-hoc reviews.
 */

import { tool } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join } from "path"

export default tool({
  description:
    "Invoke MiMo-V2.5-Pro code review on a round summary or code changes. Used by the RLCR loop for independent review, or standalone for ad-hoc code review.",
  args: {
    summary: tool.schema
      .string()
      .describe(
        "The round summary or code content to review. Can be a file path or direct text content."
      ),
    goal_tracker: tool.schema
      .string()
      .optional()
      .describe("Path to goal-tracker.md for acceptance criteria context"),
    plan: tool.schema
      .string()
      .optional()
      .describe("Path to plan.md for plan context"),
    round: tool.schema
      .number()
      .optional()
      .describe("Round number (for RLCR loop tracking)"),
    mode: tool.schema
      .enum(["round-review", "code-review", "ad-hoc"])
      .optional()
      .describe("Review mode: round-review (RLCR loop), code-review (code quality), ad-hoc (general)"),
  },
  async execute(args, context) {
    const { directory, worktree } = context
    const projectRoot = worktree || directory

    const mode = args.mode || "round-review"
    const round = args.round || 0

    // Load summary content
    let summaryContent = args.summary
    if (existsSync(args.summary)) {
      summaryContent = readFileSync(args.summary, "utf-8")
    }

    // Load goal tracker if provided
    let goalTrackerContent = ""
    if (args.goal_tracker && existsSync(args.goal_tracker)) {
      goalTrackerContent = readFileSync(args.goal_tracker, "utf-8")
    }

    // Load plan if provided
    let planContent = ""
    if (args.plan && existsSync(args.plan)) {
      planContent = readFileSync(args.plan, "utf-8")
    }

    // Build the review prompt based on mode
    let prompt = ""
    if (mode === "round-review") {
      prompt = buildRoundReviewPrompt(summaryContent, goalTrackerContent, planContent, round)
    } else if (mode === "code-review") {
      prompt = buildCodeReviewPrompt(summaryContent)
    } else {
      prompt = buildAdHocReviewPrompt(summaryContent)
    }

    // The actual MiMo invocation happens through OpenCode's agent system
    // This tool prepares the prompt and returns it for the agent to process
    return prompt
  },
})

// ========================================
// Prompt Builders
// ========================================

function buildRoundReviewPrompt(
  summary: string,
  goalTracker: string,
  plan: string,
  round: number
): string {
  return `# RLCR Round ${round} Review

## Your Role
You are an independent code reviewer for an iterative development loop.
Review the build agent's work summary and determine if the work is complete and correct.

## Goal Tracker
${goalTracker || "No goal tracker provided."}

## Plan
${plan || "No plan provided."}

## Round ${round} Summary
${summary}

## Review Instructions

1. Check if the summary is thorough and honest
2. Check if all acceptance criteria from the goal tracker are addressed
3. Check for signs of incomplete work or "glossing over" issues
4. Verify that tests were written/run where applicable
5. Check git diff for actual code changes if needed

## Output Format

If the work is complete and satisfactory, output EXACTLY this marker on its own line:
MARKER_COMPLETE

If there are issues, list them clearly with severity markers:
- [P0] Critical blocker (must fix before proceeding)
- [P1] Major issue (should fix)
- [P2] Important improvement
- [P3-P9] Minor to trivial improvements

Be strict but fair. The goal is quality, not perfection.
`
}

function buildCodeReviewPrompt(code: string): string {
  return `# Code Quality Review

## Your Role
You are a senior code reviewer. Review the following code for quality, security, and maintainability.

## Code to Review
${code}

## Review Checklist

1. **Correctness**: Does the code do what it claims?
2. **Error Handling**: Are errors handled properly?
3. **Edge Cases**: Are edge cases considered?
4. **Security**: Any security vulnerabilities?
5. **Performance**: Any obvious performance issues?
6. **Readability**: Is the code clean and well-structured?
7. **Tests**: Are there adequate tests?

## Output Format

For each issue found:
- [P0-P9] Severity and description
- Suggested fix (if applicable)

If no issues found: "No issues found. Code looks good."
`
}

function buildAdHocReviewPrompt(content: string): string {
  return `# Ad-Hoc Review

## Content to Review
${content}

## Instructions
Review the above content and provide constructive feedback.
Focus on completeness, correctness, and clarity.
`
}

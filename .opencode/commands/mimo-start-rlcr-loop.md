---
description: "Start iterative loop with MiMo review"
argument-hint: "[path/to/plan.md] [--max N] [--full-review-round N] [--skip-impl] [--skip-quiz] [--yolo]"
---

# Start RLCR Loop

## Plan Compliance Pre-Check

Before setting up the loop, validate the plan file for compliance.

**Skip this pre-check if** any of these conditions are true:
- `$ARGUMENTS` contains `--skip-impl`
- `$ARGUMENTS` contains `-h` or `--help`

### Extract the plan file path from arguments

Parse `$ARGUMENTS` to find the plan file path:
- If `--plan-file <path>` is present, use `<path>`
- Otherwise, use the first positional argument that does not start with `--`
- If no plan file path can be determined, skip the pre-check

### Read and validate plan content

1. Use the Read tool to read the plan file. If the file does not exist, skip the pre-check.

2. Use the Task tool to invoke the `plan-compliance-checker` agent:
   - prompt: Include the plan file content and ask the agent to check relevance and branch-switching
   - Parse the result:
     - `PASS`: continue to setup
     - `FAIL_RELEVANCE`: report error and stop
     - `FAIL_BRANCH_SWITCH`: report error and stop

---

## Plan Understanding Quiz

**Skip this quiz if** any of these conditions are true:
- `$ARGUMENTS` contains `--skip-impl`
- `$ARGUMENTS` contains `--yolo`
- `$ARGUMENTS` contains `--skip-quiz`

### Run the quiz agent

1. Use the Task tool to invoke the `plan-understanding-quiz` agent

2. Parse the result to extract QUESTION_1, OPTION_1A-D, ANSWER_1, QUESTION_2, OPTION_2A-D, ANSWER_2, PLAN_SUMMARY

3. Use AskUserQuestion to present both questions

4. If both correct: proceed. If wrong: show summary and ask whether to proceed or stop.

---

## Setup

If pre-check passed (or was skipped) and quiz passed (or was skipped), initialize the RLCR loop:

### Initialize Loop Directory

1. Create `.mimo-humanize/rlcr/<timestamp>/` directory
2. Copy plan file to `plan.md` in the loop directory
3. Initialize `goal-tracker.md` with:
   - IMMUTABLE section: Ultimate Goal and Acceptance Criteria from the plan
   - MUTABLE section: Active Tasks, Completed Items, Deferred Items

4. Initialize `state.md` with YAML frontmatter:
   ```
   ---
   current_round: 0
   max_iterations: <from --max flag or default 42>
   plan_file: "<path>"
   plan_tracked: true
   start_branch: "<current git branch>"
   base_branch: "<detected base branch>"
   base_commit: "<current HEAD>"
   push_every_round: false
   full_review_round: <from flag or default 5>
   review_started: false
   mainline_stall_count: 0
   last_mainline_verdict: unknown
   drift_status: normal
   privacy_mode: true
   ---
   ```

5. Initialize `.mimo-humanize/bitlesson.md` if it doesn't exist

### What Happens Next

The plugin will intercept session idle events and:
1. Detect when you write a round summary
2. Invoke the MiMo reviewer agent on your summary
3. If issues found: inject feedback, you continue working
4. If COMPLETE: transition to code review phase
5. In code review: reviewer checks code quality with [P0-9] markers
6. When no issues remain: loop finalizes

### Goal Tracker System

- **IMMUTABLE**: Ultimate Goal and Acceptance Criteria (set in Round 0, never changed)
- **MUTABLE**: Active Tasks, Completed Items, Deferred Items, Plan Evolution Log

### Two-Phase System

1. **Implementation Phase**: Work by task tags (`coding` = build agent, `analyze` = review agent)
2. **Review Phase**: After COMPLETE, code review checks quality with [P0-9] severity markers

### Important Rules

1. Always write your work summary to round-N-summary.md before exiting
2. Maintain goal-tracker.md with your progress
3. Be thorough and honest in summaries
4. Do NOT try to bypass the review loop
5. Trust the process - the reviewer's feedback helps improve quality

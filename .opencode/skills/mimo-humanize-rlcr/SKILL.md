---
name: mimo-humanize-rlcr
description: RLCR loop workflow instructions for iterative development with MiMo review
license: MIT
---

# RLCR Loop Skill

This skill provides detailed instructions for working within an active RLCR loop.

## Round Workflow

1. Read the plan and goal tracker
2. Implement tasks according to routing tags:
   - `coding` tasks: implement directly
   - `analyze` tasks: request analysis via mimo-review tool
3. Update goal-tracker.md with progress
4. Write round-N-summary.md
5. Exit (reviewer will intercept)

## Summary Requirements

Each round summary MUST include:
- Specific files, functions, and changes made
- Tests written and whether they pass
- Issues encountered and resolutions
- What was NOT completed (be honest)
- BitLesson Delta section (if applicable)

## Goal Tracker Updates

- Update MUTABLE section only
- Never modify IMMUTABLE section (Ultimate Goal, Acceptance Criteria)
- Log plan changes in Plan Evolution Log
- Mark deferred items with justification

## Review Phase

After the reviewer outputs COMPLETE:
1. Code review phase begins
2. Reviewer checks code quality with [P0-9] markers
3. Fix issues and re-trigger review
4. When no issues remain, loop finalizes

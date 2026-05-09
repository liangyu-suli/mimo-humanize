---
name: mimo-humanize
description: Iterative development with MiMo review - general instructions for the RLCR loop workflow
license: MIT
---

# Mimo-Humanize Skill

This skill provides instructions for working with the Mimo-Humanize RLCR loop.

## What is RLCR?

RLCR (Reinforcement Learning with Code Review) is an iterative development workflow where:
1. A build agent implements code against a plan
2. An independent reviewer agent checks each round of work
3. Issues are fed back for refinement
4. This continues until all acceptance criteria are met

## How to Use

1. Start a loop: `/mimo-humanize:start-rlcr-loop <plan.md>`
2. Work on tasks according to the plan
3. Write round summaries when you believe work is complete
4. The reviewer will automatically check your work
5. Address any feedback and continue

## Key Principles

- **Honest Summaries**: Always write truthful summaries of what was done
- **Goal Tracking**: Keep goal-tracker.md updated with progress
- **Trust the Process**: The reviewer's feedback improves quality
- **No Cheating**: Don't try to bypass the review loop

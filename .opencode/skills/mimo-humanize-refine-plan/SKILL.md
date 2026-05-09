---
name: mimo-humanize-refine-plan
description: Process reviewer annotations and refine existing plans
license: MIT
---

# Plan Refinement Skill

This skill provides instructions for processing reviewer annotations on plans.

## Supported Annotation Formats

- CMT/ENDCMT markers
- <cmt> tags
- <comment> tags
- Inline HTML comments
- Blockquote suggestions

## Workflow

1. Read the plan and annotations
2. Parse annotations into structured feedback
3. Resolve questions with the user
4. Apply changes to the plan
5. Write updated plan

## Rules

- Preserve original content unless explicitly changed
- Track what was changed and why
- No code implementation - plan updates only

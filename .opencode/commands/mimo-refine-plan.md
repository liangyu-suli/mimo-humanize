---
description: "Process reviewer annotations on a plan"
argument-hint: "<path/to/plan.md> [--annotations <path/to/annotations.md>]"
---

# Refine Plan

This command processes reviewer annotations (comments, suggestions) on an existing plan and incorporates them into an updated version.

## Annotation Formats Supported

- `CMT/ENDCMT` markers
- `<cmt>` tags
- `<comment>` tags
- Inline comments with `<!-- comment -->` syntax
- Markdown blockquotes with `> suggestion:` prefix

## Workflow

1. **Read the plan file** specified in arguments
2. **Read annotations** (from separate file or inline in the plan)
3. **Parse annotations** into structured feedback items
4. **For each annotation**:
   - Determine if it's a required change, suggestion, or question
   - If question: use AskUserQuestion to resolve
   - If change: apply to the plan
   - If suggestion: present options to user
5. **Write updated plan** back to the original file
6. **Report** changes made and any unresolved items

## Rules

- Preserve all original plan content unless explicitly changed by annotation
- Track what was changed and why
- Do NOT implement code - only update the plan document

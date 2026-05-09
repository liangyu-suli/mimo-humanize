---
name: mimo-humanize-gen-plan
description: Generate structured implementation plans from draft documents with MiMo convergence
license: MIT
---

# Plan Generation Skill

This skill provides instructions for generating implementation plans from draft documents.

## Workflow

1. Read the user's draft document
2. Explore the repository for context
3. Generate a MiMo analysis (risks, gaps, alternatives)
4. Build a candidate plan with acceptance criteria
5. Run convergence loop with reviewer MiMo
6. Resolve disagreements with the user
7. Write the final plan

## Plan Structure

Plans must include:
- Goal Description
- Acceptance Criteria (AC-X format with TDD tests)
- Path Boundaries (upper/lower bounds)
- Task Breakdown (coding/analyze tags)
- Dependencies and Sequence
- MiMo Deliberation (agreements, disagreements, convergence)

## Rules

- No coding during plan generation
- Preserve all original draft content
- Use AC-X format for acceptance criteria
- Every task must have a routing tag (coding/analyze)

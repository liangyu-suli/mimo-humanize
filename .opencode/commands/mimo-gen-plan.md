---
description: "Generate implementation plan from draft document"
argument-hint: "--input <path/to/draft.md> --output <path/to/plan.md> [--auto-start-rlcr-if-converged] [--discussion|--direct]"
---

# Generate Plan from Draft

This command transforms a user's draft document into a well-structured implementation plan.

## Hard Constraint: No Coding During Plan Generation

This command MUST ONLY generate a plan document. It MUST NOT implement tasks or modify source code.

---

## Phase 1: IO Validation

1. Validate `--input` file exists and is readable
2. Validate `--output` directory exists and is writable
3. Validate `--output` file does not already exist
4. If any validation fails, report error and stop

---

## Phase 2: Relevance Check

1. Read the input draft file
2. Use the Task tool to invoke `draft-relevance-checker` agent
3. If NOT_RELEVANT: report error and stop
4. If RELEVANT: continue

---

## Phase 3: MiMo First-Pass Analysis

1. Invoke MiMo (via Task tool or direct prompt) with:
   - Repository context (README, main files, structure)
   - Raw draft content
   - Request: critique assumptions, identify missing requirements, propose stronger directions
2. Preserve output as "MiMo Analysis v1" with format:
   - CORE_RISKS
   - MISSING_REQUIREMENTS
   - TECHNICAL_GAPS
   - ALTERNATIVE_DIRECTIONS
   - QUESTIONS_FOR_USER
   - CANDIDATE_CRITERIA

---

## Phase 4: Build Agent Candidate Plan (v1)

1. Use draft content + MiMo Analysis v1 to produce initial candidate plan
2. Use Explore agents to investigate codebase components mentioned in draft
3. Analyze: Clarity, Consistency, Completeness, Functionality

---

## Phase 5: Iterative Convergence Loop (Build <-> Review MiMo)

If `--direct` mode, skip this phase (set PLAN_CONVERGENCE_STATUS=partially_converged).

Otherwise, run iterative challenge/refine rounds:

1. **Reviewer MiMo Reasonability Review**: Invoke mimo-reviewer with candidate plan
   - Output: AGREE, DISAGREE, REQUIRED_CHANGES, OPTIONAL_IMPROVEMENTS, UNRESOLVED
2. **Build Agent Revision**: Update candidate plan to address REQUIRED_CHANGES
3. **Convergence Assessment**: Track topic, positions, resolution status

Loop termination:
- No REQUIRED_CHANGES remain and no high-impact DISAGREE remains
- Two consecutive rounds produce no material changes
- Maximum 3 rounds reached

Set convergence state: converged or partially_converged

---

## Phase 6: Issue and Disagreement Resolution

If `--discussion` mode and convergence achieved and `--auto-start-rlcr-if-converged`, skip manual review.

Otherwise:
1. Consolidate all QUESTIONS_FOR_USER and needs_user_decision items
2. Present issues to user via AskUserQuestion
3. Resolve all significant issues or acknowledge them

---

## Phase 7: Final Plan Generation

Generate the plan.md following this structure:

```markdown
# <Plan Title>

## Goal Description
<Clear description of what needs to be accomplished>

## Acceptance Criteria
- AC-1: <criterion>
  - Positive Tests: <...>
  - Negative Tests: <...>
- AC-2: <criterion>
  - Positive Tests: <...>
  - Negative Tests: <...>

## Path Boundaries
### Upper Bound
<...>
### Lower Bound
<...>
### Allowed Choices
<...>

## Dependencies and Sequence
### Milestones
<...>

## Task Breakdown
| Task ID | Description | Target AC | Tag (coding/analyze) | Depends On |
|---------|-------------|-----------|---------------------|------------|
| task1 | <...> | AC-1 | coding | - |

## Claude-MiMo Deliberation
### Agreements
<...>
### Resolved Disagreements
<...>
### Convergence Status
<...>

## Pending User Decisions
<...>
```

---

## Phase 8: Write and Complete

1. Write the plan to the output file
2. Report: path, summary, AC count, convergence rounds, pending decisions
3. If `--auto-start-rlcr-if-converged` and converged: start RLCR loop automatically

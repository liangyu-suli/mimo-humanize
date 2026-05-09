---
description: "Generate ideas via directed-swarm exploration"
argument-hint: "<problem description or topic>"
---

# Generate Ideas

This command uses a directed-swarm approach to generate ideas by launching multiple parallel explore agents, each developing a different direction.

## Workflow

1. **Parse the problem/topic** from `$ARGUMENTS`

2. **Launch N parallel Explore agents** (default: 3-5), each tasked with:
   - Exploring the codebase from a different angle
   - Proposing a unique approach to the problem
   - Identifying tradeoffs and risks

3. **Collect and synthesize** the agent outputs into a structured format

4. **Present to user** for selection or further refinement

## Output Format

For each direction:
- Direction name
- Approach summary
- Pros and cons
- Relevant code paths
- Estimated complexity

## Rules

- Each agent must explore independently (no cross-contamination)
- Focus on diverse approaches, not consensus
- The user makes the final decision

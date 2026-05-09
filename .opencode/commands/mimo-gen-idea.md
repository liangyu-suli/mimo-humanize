---
description: "Generate ideas via directed-swarm exploration"
argument-hint: "<problem description or topic>"
---

# Generate Ideas

This command uses a directed-swarm approach to generate ideas by launching multiple parallel explore agents, each developing a different direction.

## Workflow

1. **Parse the problem/topic** from `$ARGUMENTS`

2. **Check current mode**: If OpenCode is in plan mode, remind the user that draft files cannot be written in plan mode. Suggest switching to build mode first, or present the ideas for the user to copy manually.

3. **Launch N parallel Explore agents** (default: 3-5), each tasked with:
   - Exploring the codebase from a different angle
   - Proposing a unique approach to the problem
   - Identifying tradeoffs and risks

4. **Collect and synthesize** the agent outputs into a structured format

5. **Write draft file** (only if NOT in plan mode): Save the synthesized ideas to `docs/draft-<topic>.md` where `<topic>` is a short slug from the problem description.

6. **Present to user** for selection or further refinement

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
- Always attempt to write a draft file unless in plan mode
- If in plan mode, display a clear notice: "NOTE: OpenCode is in plan mode -- draft file not written. Switch to build mode or copy the output above to a file manually."

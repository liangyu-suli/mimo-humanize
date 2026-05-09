---
description: "Cancel active RLCR loop"
---

# Cancel RLCR Loop

To cancel the active loop:

1. Find the active loop directory in `.mimo-humanize/rlcr/`
2. Check for state files:
   - `state.md` exists: normal loop
   - `finalize-state.md` exists: finalize phase
   - `complete-state.md` exists: already completed

3. If in finalize phase, use AskUserQuestion to confirm:
   - "The loop is in Finalize Phase. Cancel now or let it finish?"
   - Options: "Yes, cancel now" / "No, let it finish"

4. To cancel: rename state.md to cancel-state.md

5. Report cancellation to user. The loop directory with summaries and review results is preserved for reference.

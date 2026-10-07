---
name: planning-with-files
description: Externalize task plans, progress tracking, and intermediate checkpoints into filesystem artifacts to maintain persistence across sessions.
metadata:
  origin: ECC
---

# Planning with Files

Use this skill when managing complex, multi-phase tasks that span beyond a single short turn.

## Workflow

1. **State Persistence**: Maintain an active status artifact (e.g. `devAi/scratch/ACTIVE_PLAN.md` or `task.md`).
2. **Progress Checkpoints**:
   - `[x]` Completed milestones.
   - `[-]` Active milestone with current sub-step.
   - `[ ]` Queued items.
3. **Session Recovery**: When starting or resuming, read the plan file directly to determine immediate next action without asking the user or re-analyzing history.

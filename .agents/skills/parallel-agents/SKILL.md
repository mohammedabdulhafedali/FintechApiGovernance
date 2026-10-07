---
name: parallel-agents
description: Multi-Agent orchestration patterns for running independent jobs concurrently, managing lifecycle, timeout, and result convergence.
metadata:
  origin: ECC
---

# Parallel Agents

Use this skill for orchestrating concurrent execution of independent AI agent workloads.

## Execution Model

1. **Parallel Execution Gate**:
   - Verify non-overlapping file scopes.
   - Verify CPU/Token concurrency limits.
2. **Worker Lifecycle**:
   - Spawn isolated worker agents.
   - Set finite timeout and strict deliverables.
3. **Synchronization & Convergence**:
   - Collect individual execution reports.
   - Run verification and diff validation across all modified surfaces.
   - Merge outputs into the primary project context.

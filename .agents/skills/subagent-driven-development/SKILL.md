---
name: subagent-driven-development
description: Methodology for delegating scoped implementation, testing, and debugging tasks to ephemeral subagents while preserving lead context.
metadata:
  origin: ECC
---

# Subagent-Driven Development

Use this skill when developing software by delegating modular implementation steps to ephemeral subagents.

## Workflow

1. **Lead Preparation**:
   - Establish task boundary, acceptance criteria, and input files.
2. **Subagent Delegation**:
   - Spawn subagent with isolated task context.
   - Restrict subagent action scope to target directory or files.
3. **Receipt & Audit**:
   - Lead inspects subagent output and verifies test results or git diff.
   - Terminate subagent context immediately after successful handoff.

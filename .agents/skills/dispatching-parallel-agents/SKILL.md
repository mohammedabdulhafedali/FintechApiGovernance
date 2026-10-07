---
name: dispatching-parallel-agents
description: Deconstruct complex workflows into independent tasks and dispatch them to specialized agents in parallel with isolated context. Use when handling multi-faceted tasks that can be broken down safely.
metadata:
  origin: ECC
---

# Dispatching Parallel Agents

Use this skill when orchestrating multiple agents to work on independent parts of a problem simultaneously without collision.

## Core Dispatch Workflow

1. **Dependency Analysis**: Identify tasks with zero mutual dependencies.
2. **Context Isolation**: Package only the minimal required context for each target agent.
3. **Dispatch Specification**:
   - Explicit target file/scope.
   - Clear output format and validation criteria.
   - Strict read/write boundaries to prevent race conditions.
4. **Result Aggregation**: Collate outputs from completed subagents into a unified synthesis before taking follow-up action.

## Safety Rules

- Never dispatch two agents with write permissions to the same file.
- If task B depends on output of task A, do not run in parallel; chain sequentially.

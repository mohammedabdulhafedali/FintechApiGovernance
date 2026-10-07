---
name: multi-agent-patterns
description: Architectural patterns for structuring agent teams (Supervisor, Swarm, Pipeline, Critic) based on system scale and decoupling needs.
metadata:
  origin: ECC
---

# Multi-Agent Patterns

Use this skill when architecting relationships and collaboration topologies between multiple AI agents.

## Standard Topologies

1. **Supervisor-Worker**:
   - Supervisor acts as coordinator and never writes code directly.
   - Workers execute narrow tasks and return structured results to supervisor.
2. **Assembly Pipeline**:
   - Agent A (Specification/Design) -> Agent B (Implementation) -> Agent C (Verification/Test).
3. **Critic-Actor Loop**:
   - Actor implements changes; Critic tests and audits against requirements before human sign-off.
4. **Autonomous Swarm**:
   - Peer agents coordinate via shared state files (e.g. queue or blackboard).

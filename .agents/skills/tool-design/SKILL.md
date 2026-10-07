---
name: tool-design
description: Design, calibrate, and invoke agent tools/MCP servers with high precision, minimal parameters, and zero token waste.
metadata:
  origin: ECC
---

# Tool Design

Use this skill when designing or invoking tools and MCP capabilities to minimize latency and agent tool selection failure.

## Design Tenets

1. **Orthogonal Tools**: Each tool should have one distinct responsibility; avoid overlapping tools that confuse tool router heuristics.
2. **Minimal Schemas**: Keep argument definitions concise; omit optional bloat that adds token overhead on every turn.
3. **Structured Returns**: Return compact JSON or structured text with error statuses rather than unrestricted prose.
4. **Fast Failure**: Return actionable error messages directly if pre-conditions fail.

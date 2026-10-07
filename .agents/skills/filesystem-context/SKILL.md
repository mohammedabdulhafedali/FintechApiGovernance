---
name: filesystem-context
description: Offload heavy context, logs, and artifacts to local filesystem storage and read on-demand instead of polluting conversation memory.
metadata:
  origin: ECC
---

# Filesystem Context

Use this skill to treat the local filesystem as external memory, freeing up LLM context window space.

## Implementation Pattern

1. **Scratch Storage**: Dump large JSON responses, build outputs, or analysis dumps to `devAi/scratch/` or artifact directories.
2. **On-Demand Inspection**: Use grep or slice tools to inspect only relevant portions of stored files.
3. **Reference Passing**: Pass filepaths between agent steps instead of passing entire file payloads.
4. **Cleanup Policy**: Ensure scratch buffers are excluded from git or pruned after task completion.

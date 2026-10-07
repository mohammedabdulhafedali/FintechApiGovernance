---
name: context-compression
description: Algorithmic compression, periodic summarization, and key-decision distilling across long agent sessions to prevent context overflow.
metadata:
  origin: ECC
---

# Context Compression

Use this skill when a conversation or task trajectory exceeds normal lengths, requiring session compaction without losing critical architectural decisions.

## Compression Strategies

1. **Distill Decisions**: Extract core conclusions, rejected alternatives, and current state.
2. **Discard Transients**: Prune intermediate error logs, failed attempts, and verbose search outputs.
3. **Structured Milestone Snapshots**:
   - `Current Milestone`: What is fully completed.
   - `Pending Work`: Exactly what remains.
   - `Constraints / Gotchas`: Crucial boundaries learned during debugging.

# ⚡ Agent Performance, Context Hygiene & Concurrency Protocol

**File:** `.agents/rules/agent-performance-and-context.md`  
**Purpose:** Governance rules to ensure maximum agent execution speed, zero prompt bloat, and safe parallel/subagent execution.

---

## 1. Context Hygiene & Efficiency (Zero Bloat)
- **Slice Over Dump:** When reading files, never read >150 lines if only a specific section or function is needed. Use `view_file` with `StartLine` and `EndLine`.
- **Filesystem Offloading:** Large intermediate artifacts, analysis reports, or mock JSON must be written to `devAi/scratch/` and referenced by path rather than outputted inline.
- **Concise Outputs:** Eliminate narrative filler, redundant introductions, and repetition of known facts.

## 2. Multi-Agent & Parallel Execution Bounds
- **Parallel Dispatch Gate:** Use subagents or parallel agents only when tasks are:
  1. Completely decoupled with zero shared state.
  2. Operating on disjoint files/directories.
- **Race Condition Prevention:** Under no circumstances should two concurrent executions modify the same file.
- **Ephemeral Lifecycle:** Subagents must terminate as soon as their designated output/file is written and verified.

## 3. Plan Persistence via Files
- For complex tasks spanning more than 3 distinct engineering phases, track progress in `devAi/scratch/ACTIVE_PLAN.md` with checkable items.

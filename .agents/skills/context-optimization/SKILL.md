---
name: context-optimization
description: Active context sanitation, token budget reduction, and noise filtering to keep agent context lean, fast, and highly focused.
metadata:
  origin: ECC
---

# Context Optimization

Use this skill to optimize context window utilization, lower latency (TTFT), and avoid prompt degradation.

## Optimization Rules

1. **Output Trimming**: Never echo massive logs or complete file contents into chat if a summary or slice suffices.
2. **Read Slicing**: Use targeted line ranges (`StartLine`, `EndLine`) when reading code instead of dumping entire files.
3. **Filter Shell Commands**: Pipe large outputs through grep or head/tail where appropriate.
4. **Zero Fluff**: Eliminate redundant polite boilerplate and repetitive explanations.

---
name: context-fundamentals
description: Principles of LLM context window mechanics, token economy, attention degradation, and latency factors in agentic workflows.
metadata:
  origin: ECC
---

# Context Fundamentals

Use this skill as foundational knowledge for diagnosing degradation, latency spikes, and hallucinations in agent systems.

## Key Concepts

1. **Lost in the Middle**: Information placed in the center of huge context windows experiences reduced retrieval accuracy. Place vital constraints at the beginning and ends.
2. **Attention Dilution**: Every irrelevant line of logs or boilerplate reduces attention weight allocated to core architectural rules.
3. **TTFT & Latency**: Time to First Token scales directly with prompt token count. Keep system guidance sharp and modular.

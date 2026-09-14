# Wellness Coach AI Knowledge Package

This package is designed for a small local LLM used as a Wellness Coach. The LLM handles intent, reasoning, personalization, plan generation and explanations. Deterministic software handles nutrition math, energy calculations, hydration calculations and progress calculations.

## Architecture

```text
Mobile App
  ├─ Local LLM (Qwen-class small instruction model)
  ├─ SQLite: foods / recipes / exercises / knowledge
  ├─ Calculator: BMR / TDEE / calories / macros / micros / hydration / trends
  └─ Safety + validation layer
```

### Non-negotiable
Never let the LLM invent nutrient numbers or do final arithmetic when a database/calculator can do it.

### RAG flow
User request → intent → retrieve relevant records → calculator → LLM structured response → validator → UI.

### Package
- knowledge/coach_rules.md
- knowledge/nutrition_rules.json
- knowledge/exercise_rules.json
- knowledge/hydration_rules.json
- knowledge/safety_rules.json
- schemas/*.json
- training/coach_scenarios.jsonl
- prompts/system_prompt.md
- mobile/mobile_integration.md
- sources/research_sources.md

Production food numbers must come from verified food-composition data.

# Mobile Integration

## Recommended architecture

```text
App
 ├─ Local LLM runtime
 ├─ SQLite
 │   ├─ foods
 │   ├─ recipes
 │   ├─ exercises
 │   └─ knowledge chunks
 ├─ deterministic calculation engine
 └─ validator/safety engine
```

## Runtime flow

1. User asks a question.
2. App identifies intent.
3. Retrieve relevant SQLite records.
4. Calculate numeric targets outside the LLM.
5. Send compact context + user profile + constraints to local LLM.
6. LLM returns structured JSON.
7. Validator checks calories, macros, restrictions, safety and schema.
8. App renders the response.

## Why this works on mobile

The model does not need to memorize thousands of foods. SQLite stores the facts. RAG retrieves only relevant knowledge. The calculator performs exact arithmetic.

## Model

Start by benchmarking a quantized Qwen-class instruction model around 1.7B parameters. Evaluate 4-bit and other supported quantizations on target iPhones/Android devices for RAM, latency, tokens/sec, battery and thermal behavior.

## iOS

Use a mobile-compatible local inference runtime and/or Core ML conversion depending on the selected model. Keep the LLM behind an app service interface so the model can be replaced later.

## Android

Use a compatible native/mobile inference runtime for the chosen model format. Benchmark low-, mid- and high-tier devices.

## Important separation

LLM:
- intent
- reasoning
- recipe wording
- meal planning
- exercise planning
- explanations
- substitutions

Code/database:
- calories
- macros
- micronutrients
- BMR/TDEE
- weight trend
- hydration math
- exercise metadata
- safety rules

## Future photo meal logging

Photo → vision model → food IDs + estimated portions → user confirmation → SQLite → deterministic nutrient calculation.

Do not rely on vision/LLM output as exact nutrition.

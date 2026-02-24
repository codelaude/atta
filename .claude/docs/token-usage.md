# Token Usage & Cost

Skills load their instructions into the conversation context. Heavier skills cost more tokens, but the expensive ones are one-time setup — daily skills are lightweight.

## Estimated tokens per invocation (input + output, all turns)

| Skill | Frequency | Est. Input | Est. Output | Sonnet Cost | Opus Cost |
|-------|-----------|-----------|------------|-------------|-----------|
| `/atta` | Once per project | ~50-70K | ~15-25K | ~$0.40-0.60 | ~$2-3 |
| `/tutorial` | Once per user | ~15-20K | ~3-5K | ~$0.10-0.15 | ~$0.50-0.70 |
| `/collaborate` | Occasional | ~30-50K | ~10-15K | ~$0.30-0.50 | ~$1.50-2.50 |
| `/review` | Frequent | ~10-15K | ~3-5K | ~$0.08-0.12 | ~$0.35-0.50 |
| `/preflight` | Frequent | ~12-18K | ~5-8K | ~$0.10-0.18 | ~$0.50-0.80 |
| `/agent` | Frequent | ~5-10K | ~2-4K | ~$0.04-0.08 | ~$0.15-0.35 |
| `/lint` | Frequent | ~5-8K | ~2-3K | ~$0.03-0.06 | ~$0.12-0.25 |

> Estimates based on typical usage. Actual costs depend on codebase size, number of files reviewed, and conversation length. Subscription plans (Claude Pro/Max) count against usage budgets rather than per-token billing.

**Key takeaway:** Setup (`/atta`) is the most expensive invocation but only runs once. Daily skills (`/review`, `/lint`, `/agent`) are 5-10x cheaper.

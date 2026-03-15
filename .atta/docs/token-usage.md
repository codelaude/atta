# Token Usage & Cost

Skills load their instructions into the conversation context. Heavier skills cost more tokens, but the expensive ones are one-time setup — daily skills are lightweight.

## Model Targeting (v3.0)

Since v3.0, each skill has a recommended model tier defined in `.atta/team/model-registry.json`. This means not every skill needs to run on the most expensive model:

| Tier | Model (Claude Code) | Skills |
|------|-------------------|-------|
| **Light** | Haiku | `/atta`, `/atta-preflight`, `/atta-ship`, `/atta-test`, `/atta-update`, `/atta-patterns`, `/atta-migrate`, `/atta-profile`, `/atta-tutorial`, `/atta-lint`, `/atta-agent` |
| **Mid** | Sonnet | `/atta-review`, `/atta-optimize`, `/atta-librarian`, `/atta-team-lead`, `/atta-route`, `/atta-checklist` |
| **Full** | Opus | `/atta-security-audit`, `/atta-collaborate` |

The `model-gate.sh` hook enforces model selection — it **blocks** skills running on a more expensive model than their tier recommends. Use `--bypass` to override, or set `ATTA_MODEL_GATE=off` to disable globally.

## Estimated tokens per invocation (input + output, all turns)

| Skill | Frequency | Tier | Est. Input | Est. Output | Est. Cost |
|-------|-----------|------|-----------|------------|-----------|
| `/atta` | Once per project | Light | ~50-70K | ~15-25K | ~$0.05-0.10 |
| `/atta-tutorial` | Once per user | Light | ~12-18K | ~3-5K | ~$0.02-0.03 |
| `/atta-collaborate` | Occasional | Full | ~25-40K | ~8-12K | ~$1.00-2.00 |
| `/atta-security-audit` | Occasional | Full | ~15-25K | ~5-10K | ~$0.60-1.20 |
| `/atta-review` | Frequent | Mid | ~8-12K | ~3-5K | ~$0.05-0.08 |
| `/atta-preflight` | Frequent | Light | ~10-15K | ~4-6K | ~$0.02-0.03 |
| `/atta-agent` | Frequent | Light | ~4-8K | ~2-3K | ~$0.01-0.02 |
| `/atta-lint` | Frequent | Light | ~4-6K | ~2-3K | ~$0.01-0.02 |
| `/atta-optimize` | Occasional | Mid | ~5-10K | ~3-5K | ~$0.03-0.06 |
| `/atta-librarian` | Occasional | Mid | ~5-8K | ~2-4K | ~$0.03-0.05 |

> Estimates based on typical usage with recommended model tiers. Actual costs depend on codebase size, number of files reviewed, and conversation length. Subscription plans (Claude Pro/Max) count against usage budgets rather than per-token billing.

**Key takeaway:** Most daily skills (`/atta-lint`, `/atta-agent`, `/atta-preflight`) run on Haiku at ~$0.01-0.03 per invocation. Only security audit and multi-agent collaboration need Opus. Setup (`/atta`) runs once on Haiku and costs ~$0.05-0.10.

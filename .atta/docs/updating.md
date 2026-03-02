# Keeping Up to Date

Do **not** manually copy a new `.claude/` folder on top of your existing one — that will overwrite your customizations. Use the update system instead:

```bash
# 1. Clone latest framework into staging
git clone --depth 1 <framework-repo-url> .claude_staging

# 2. Preview, dry-run, then apply
/update check   --from ./.claude_staging/.claude
/update pull --dry-run --from ./.claude_staging/.claude
/update pull     --from ./.claude_staging/.claude

# 3. Clean up
rm -rf .claude_staging
```

`/update` automatically chooses the right mode:
- **Upgrade mode** (default) when update tracking metadata exists
- **Migration-bootstrap mode** when `.atta/.metadata/file-manifest.json` is missing
- **Migration mode** for structural transitions only when explicitly requested with `--mode migration`

All your customizations (pattern files, agent tweaks, project context) are preserved.

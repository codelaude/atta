# Keeping Up to Date

Do **not** manually copy new `.claude/` and `.atta/` folders on top of your existing ones — that will overwrite your customizations. Use the update system instead:

```bash
# 1. Clone latest framework into staging
git clone --depth 1 <framework-repo-url> .atta_staging

# 2. Preview, dry-run, then apply
/atta-update check   --from ./.atta_staging/.claude
/atta-update pull --dry-run --from ./.atta_staging/.claude
/atta-update pull     --from ./.atta_staging/.claude

# 3. Clean up
rm -rf .atta_staging
```

`/atta-update` automatically chooses the right mode:
- **Upgrade mode** (default) when update tracking metadata exists
- **Migration-bootstrap mode** when `.atta/.metadata/file-manifest.json` is missing
- **Migration mode** for structural transitions only when explicitly requested with `--mode migration`

All your customizations (pattern files, agent tweaks, project context, developer profile) are preserved.

For major version upgrades (e.g., v2.x → v3.0), see the [Migration Guide](migration.md).

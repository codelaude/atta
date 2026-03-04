import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pc from 'picocolors';
import { copySharedContent, copyBootstrap } from './shared.js';

/**
 * GitHub Action adapter — generates `.github/workflows/atta-review.yml`.
 *
 * Adds context-aware CI code review to any project. The generated workflow
 * reads the project's own knowledge files (.atta/knowledge/) to scope the
 * review to the actual tech stack and conventions — no generic prompts.
 *
 * Design constraints (from PLAN.md):
 * - CI action is read-only: never writes to .atta/
 * - All learning happens locally via /patterns, then committed normally
 * - Suppression workflow: CI flags → author triages → adds to ci-suppressions.md
 *   → human reviewer approves/rejects in PR diff → merges to main
 * - The workflow YAML structure is user-configured; Atta owns the prompt section
 * - Compatible with claude-code-action and any runner that accepts a review prompt
 *
 * Options:
 *   authBackend — 'anthropic' (default) | 'bedrock' | 'vertex' | 'foundry'
 *                 Claude backends: direct API, AWS Bedrock, GCP Vertex, Azure Foundry
 *   provider    — 'anthropic' (default) | 'openai' | 'azure' | 'ollama'
 *                 'openai'|'azure'|'ollama' use appleboy/LLM-action (OpenAI-compatible endpoint)
 *
 * To update the prompt after conventions change: re-run `atta init --adapter github-action`
 * (the workflow always reads the latest .atta/knowledge/ files, so this is rarely needed).
 */
export function install(claudeRoot, attaRoot, targetDir, options = {}) {
  const results = { files: 0 };

  const provider = options.provider || 'anthropic';
  const authBackend = options.authBackend || 'anthropic';

  // Generate .github/workflows/atta-review.yml
  const workflowDir = join(targetDir, '.github', 'workflows');
  mkdirSync(workflowDir, { recursive: true });

  const workflowPath = join(workflowDir, 'atta-review.yml');
  const isLLMAction = ['openai', 'azure', 'ollama'].includes(provider);
  writeFileSync(
    workflowPath,
    isLLMAction ? buildWorkflowLLMAction({ provider }) : buildWorkflow({ authBackend })
  );
  results.files++;

  if (!options.quiet) {
    console.log(`  ${pc.green('✓')} .github/workflows/atta-review.yml`);
  }

  // Generate ci-suppressions.md only if it doesn't exist (preserve user content)
  const knowledgeDir = join(targetDir, '.atta', 'knowledge');
  const suppressionsPath = join(knowledgeDir, 'ci-suppressions.md');
  if (!existsSync(suppressionsPath)) {
    mkdirSync(knowledgeDir, { recursive: true });
    writeFileSync(suppressionsPath, buildSuppressions());
    results.files++;

    if (!options.quiet) {
      console.log(`  ${pc.green('✓')} .atta/knowledge/ci-suppressions.md`);
    }
  }

  // Copy shared content to .atta/ (needed if this is a standalone install)
  const sharedCount = copySharedContent(attaRoot, targetDir, options);
  results.files += sharedCount;

  const bootstrapCount = copyBootstrap(attaRoot, targetDir, options);
  results.files += bootstrapCount;

  return results;
}

/**
 * The review prompt body — identical across all providers.
 * Instructs the CI model to read .atta/knowledge/ files before reviewing.
 * Provider-agnostic: any capable LLM can follow these instructions.
 */
function buildPromptBody() {
  return `\
            You are performing a context-aware code review for this pull request.

            IMPORTANT: Before reviewing any code, read these project knowledge files:

            1. \`.atta/knowledge/project/project-context.md\` — tech stack and architecture
            2. \`.atta/knowledge/project/project-profile.md\` — team conventions and review priorities (if exists)
            3. All \`*.md\` files in \`.atta/knowledge/patterns/\` — technology-specific conventions
            4. \`.atta/knowledge/ci-suppressions.md\` — known false positives (skip these)

            Then review all files changed in this PR.

            **What to flag:**
            - Violations of conventions documented in the pattern files
            - Security vulnerabilities relevant to the detected tech stack only.
              Determine OWASP scope from project-context.md — for example:
              skip XXE checks for REST-only APIs, skip CSRF for CLI tools,
              skip injection checks for static sites, skip auth checks for libraries.
            - Correctness bugs and logic errors with clear code evidence
            - Missing validation at system boundaries (user input, external APIs)

            **What NOT to flag:**
            - Patterns explicitly documented as correct in .atta/knowledge/ files
            - Anything listed in .atta/knowledge/ci-suppressions.md
            - Style preferences not in the project's own pattern files
            - Hypothetical or theoretical issues without concrete code evidence
            - Issues in vendored or generated files (node_modules, dist/, build/, *.min.js)

            **Finding format (one finding per line):**
            \`\`\`
            **[CRITICAL]** path/to/file.ts:42 — Description (rule: pattern-file rule or OWASP:A01)
            **[HIGH]** path/to/file.ts:87 — Description
            **[MEDIUM]** path/to/file.ts:103 — Description
            **[INFO]** path/to/file.ts:210 — Optional improvement
            \`\`\`

            If project-context.md is empty or patterns/ has no files, prepend this note:
            > This review used generic checks. Run \`/atta\` in your project to enable
            > stack-aware, convention-scoped CI reviews.

            End with a one-line summary: "X critical, Y high, Z medium findings."`;
}

/**
 * Auth configuration for claude-code-action backends.
 * Returns the `with:` fields and optional `env:` block for each backend.
 */
function buildClaudeAuthWith(authBackend) {
  switch (authBackend) {
    case 'bedrock':
      return `          use_bedrock: "true"`;
    case 'vertex':
      return `          use_vertex: "true"`;
    case 'foundry':
      return `          use_foundry: "true"`;
    default: // 'anthropic'
      return `          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}`;
  }
}

function buildClaudeAuthEnv(authBackend) {
  switch (authBackend) {
    case 'bedrock':
      return `
        env:
          AWS_REGION: us-east-1
          AWS_ACCESS_KEY_ID: \${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          # AWS_ROLE_ARN: \${{ secrets.AWS_ROLE_ARN }}  # optional: if using role assumption`;
    case 'vertex':
      return `
        env:
          ANTHROPIC_VERTEX_PROJECT_ID: \${{ secrets.GCP_PROJECT_ID }}
          CLOUD_ML_REGION: us-east5`;
    case 'foundry':
      return `
        env:
          AZURE_OPENAI_ENDPOINT: \${{ secrets.AZURE_ENDPOINT }}
          # See https://github.com/anthropics/claude-code-action for full Foundry setup`;
    default: // 'anthropic'
      return '';
  }
}

function buildSetupComment(authBackend) {
  switch (authBackend) {
    case 'bedrock':
      return '# Setup: Add AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY to repository secrets.';
    case 'vertex':
      return '# Setup: Add GCP_PROJECT_ID to repository secrets and configure Workload Identity.';
    case 'foundry':
      return '# Setup: Add AZURE_ENDPOINT to repository secrets and configure Azure AI Foundry.';
    default:
      return '# Setup: Add ANTHROPIC_API_KEY to your repository secrets.';
  }
}

/**
 * Build the GitHub Actions workflow YAML for claude-code-action (Anthropic/Bedrock/Vertex/Foundry).
 *
 * The prompt instructs the CI model to read .atta/knowledge/ files before
 * reviewing — stack context and conventions stay in the repo, not inlined here.
 * Users configure runner, permissions, and action version; Atta owns the prompt.
 */
function buildWorkflow({ authBackend = 'anthropic' } = {}) {
  const setupComment = buildSetupComment(authBackend);
  const authWith = buildClaudeAuthWith(authBackend);
  const authEnv = buildClaudeAuthEnv(authBackend);
  const promptBody = buildPromptBody();

  return `# Atta Context-Aware Code Review
# Generated by Atta — https://github.com/nicholasgasior/atta-dev
#
${setupComment}
# Docs: https://github.com/nicholasgasior/atta-dev/blob/main/.atta/docs/ci-review.md
#
# Suppress false positives: .atta/knowledge/ci-suppressions.md
# Improve review quality:   run /atta in your project (detects stack + conventions)

name: Atta Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Context-Aware Code Review
        uses: anthropics/claude-code-action@v1
        with:
${authWith}
          prompt: |
${promptBody}${authEnv}
`;
}

/**
 * Build the GitHub Actions workflow YAML for appleboy/LLM-action.
 * Supports any OpenAI-compatible endpoint: OpenAI, Azure OpenAI, Ollama, LocalAI, vLLM.
 *
 * Note: Anthropic is NOT natively supported by appleboy/LLM-action.
 * For Claude, use the default (anthropic/bedrock/vertex/foundry) path above.
 */
function buildWorkflowLLMAction({ provider = 'openai' } = {}) {
  let setupComment, apiKeyRef, model;

  switch (provider) {
    case 'azure':
      setupComment = '# Setup: Add AZURE_OPENAI_API_KEY to repository secrets. Update base_url with your Azure endpoint.';
      apiKeyRef = `          api_key: \${{ secrets.AZURE_OPENAI_API_KEY }}
          base_url: "https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT/v1"`;
      model = 'gpt-4o';
      break;
    case 'ollama':
      setupComment = '# Setup: Ollama must be accessible from the Actions runner (self-hosted runner recommended).';
      apiKeyRef = `          base_url: "http://localhost:11434/v1"
          # api_key: not required for Ollama`;
      model = 'llama3.2';
      break;
    default: // 'openai'
      setupComment = '# Setup: Add OPENAI_API_KEY to your repository secrets.';
      apiKeyRef = `          api_key: \${{ secrets.OPENAI_API_KEY }}
          base_url: "https://api.openai.com/v1"`;
      model = 'gpt-4o';
      break;
  }

  const promptBody = buildPromptBody();

  return `# Atta Context-Aware Code Review (${provider})
# Generated by Atta — https://github.com/nicholasgasior/atta-dev
#
${setupComment}
# Docs: https://github.com/nicholasgasior/atta-dev/blob/main/.atta/docs/ci-review.md
#
# Suppress false positives: .atta/knowledge/ci-suppressions.md
# Improve review quality:   run /atta in your project (detects stack + conventions)
#
# Note: uses appleboy/LLM-action (OpenAI-compatible endpoints).
# For Claude (Anthropic/Bedrock/Vertex), use: atta init --adapter github-action

name: Atta Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Context-Aware Code Review
        uses: appleboy/LLM-action@v1.3.1
        with:
          model: "${model}"
${apiKeyRef}
          prompt_template: |
${promptBody}
`;
}

/**
 * Build the initial ci-suppressions.md.
 * Teams add entries here for confirmed false positives.
 * Each suppression is reviewed as part of the PR that introduces it.
 * Over time, use `/patterns promote` to replace suppressions with understood patterns.
 */
function buildSuppressions() {
  return `# CI Review Suppressions

> Add confirmed false positives here so the CI reviewer skips them.
> Each entry lands in a PR diff — the human reviewer approves or rejects the suppression.
> Over time, use \`/patterns promote\` to replace raw suppressions with understood patterns
> (the AI stops flagging the category, not just the specific instance).

## How to Add a Suppression

When CI flags something that isn't a real issue:
1. Verify it's a false positive (paste the finding into your local AI tool to confirm)
2. Add an entry below in this PR
3. Your reviewer approves or rejects the suppression in the PR diff
4. On merge, all future PRs benefit

\`\`\`yaml
suppressions:
  # Example:
  # - pattern: "eval() in scripts/codegen.js"
  #   reason: "Code generation script runs in a sandboxed build environment, no user input"
  #   added_by: "@your-username"
  #   reviewed_by: "@reviewer"
\`\`\`

## Active Suppressions

\`\`\`yaml
suppressions: []
\`\`\`
`;
}

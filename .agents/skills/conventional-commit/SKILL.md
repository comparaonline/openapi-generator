---
name: conventional-commit
description: >
  Guides git commit creation following Conventional Commits format with
  intelligent grouping, scope detection, and validation.

  Use this skill whenever the user wants to create git commits, mentions
  committing changes, asks to "commit this", "make a commit",

  or references git commit workflow — including casual phrases like "ok commit",
  "save this", or "done, commit it".

  Handles staged files, specific files, or complete change analysis with
  automatic scope detection and commitlint validation.

  Also use when the user is on a protected branch and needs to create a feature
  branch first.
metadata:
  version: 1.0.1
compatibility: >
  Requires git. All other tools are optional — the skill falls back to defaults

  if not available.

  - Node ≥ 14: commitlint config parsing and validation (Node.js projects)

  - commitizen ≥ 3: commit validation for Python projects (`pip install
  commitizen`)
---

# Conventional Commit Skill

Creates well-structured git commits following Conventional Commits format. Analyzes changes, detects scopes, groups logically, validates against commitlint, and presents a plan for approval.

## Core Workflow

### 1. Branch Protection Check

```bash
git branch --show-current
```

**If on `main`, `master`, `release`, or `develop`:**

- Block immediately
- Suggest feature branch name based on changes
- Offer to create: `git checkout -b <suggested-name>`
- Wait for user decision

### 2. Environment Detection

Run both checks independently — a project can be both (e.g., a full-stack monorepo).

**Node.js** — check for lock file:

```bash
ls pnpm-lock.yaml bun.lockb yarn.lock package-lock.json 2>/dev/null
```

| Lock file                   | Command prefix |
| --------------------------- | -------------- |
| `pnpm-lock.yaml`            | `pnpm dlx`     |
| `bun.lockb`                 | `bunx`         |
| `yarn.lock`                 | `yarn`         |
| `package-lock.json` or none | `npx`          |

**Python** — check for project indicators:

```bash
ls pyproject.toml requirements.txt setup.py Pipfile 2>/dev/null
```

If found, check whether commitizen is installed:

```bash
cz version 2>/dev/null
```

### 3. Dynamic Configuration

Priority: commitlint (Node) → commitizen (Python) → defaults.

**commitlint** (if any commitlint config file exists):

```bash
ls commitlint.config.js commitlint.config.cjs commitlint.config.mjs commitlint.config.ts commitlint.config.cts .commitlintrc* 2>/dev/null
```

Also check `package.json` for an inline `commitlint` field:

```bash
node -e "const p=require('./package.json');process.exit(p.commitlint?0:1)" 2>/dev/null
```

If either check succeeds, proceed with `--print-config`.

Extract the resolved config using Node (cross-platform, no extra dependencies):

```bash
NO_COLOR=1 <pkg-prefix> commitlint --print-config | node -e "
  let d='';
  process.stdin.on('data',c=>d+=c).on('end',()=>{
    const r=JSON.parse(d).rules;
    console.log(JSON.stringify({
      types: r['type-enum']?.[2],
      scopes: r['scope-enum']?.[2],
      maxLen: r['subject-max-length']?.[2]
    }));
  })"
```

Use the extracted `types`, `scopes`, and `maxLen`. If any field is null or the command fails, fall back to defaults.

**commitizen** (Python project + `cz` available, no commitlint config found):

Commitizen doesn't define `type-enum` or `scope-enum` — use defaults for types and detect scopes from paths. Commitizen is used only for validation in step 7.

**Defaults** (no commitlint or commitizen):

- Types: all conventional commit types (see step 6)
- Max subject: 72 chars
- Detect scopes from paths

### 4. Scenario Detection

**Scenario 1: User-specified files**

- Parse file names from user message
- Only process mentioned files

**Scenario 2: Staged files only**

- `git diff --cached --name-status` has results
- Process staged files

**Scenario 3: Complete analysis**

- `git status --porcelain` shows changes
- Analyze and group all changes

**Scenario 4: No changes**

- Inform user, don't create empty commits

**Scenario 5: Merge conflicts**

- `git diff --name-only --diff-filter=U` returns files
- Block and tell user to resolve first

**Scenario 6: Explicit amend**

- User says "amend"
- Use `git commit --amend`

### 5. Change Analysis & Grouping

```bash
git diff --cached --name-status  # Staged
git status --porcelain           # All changes
```

**Renamed files:** `--name-status` outputs renames as `R<similarity>\t<old-path>\t<new-path>` (e.g. `R100\tsrc/old.ts\tsrc/new.ts`). Use the new path for scope detection and staging. The old path's deletion is already tracked — no need to stage it separately.

**Grouping rule:** All files sharing the same type and scope go into one commit, regardless of how many files.

**Separation rule:** Always separate test files from implementation files into different commits.

**Large changesets:** If grouping still results in more than 10 proposed commits, warn the user and offer to consolidate related scopes (e.g., merge `feat(auth)` and `feat(auth-utils)` if the changes are closely related). Ask before consolidating.

**Example:**

```
Files:
- src/auth/login.ts (modified)
- src/auth/middleware.ts (modified)
- src/auth/__tests__/login.test.ts (modified)
- src/auth/__tests__/middleware.test.ts (modified)

Result: 2 commits
1. feat(auth): <description>
   - src/auth/login.ts
   - src/auth/middleware.ts
2. test(auth): <description>
   - src/auth/__tests__/login.test.ts
   - src/auth/__tests__/middleware.test.ts
```

### 6. Commit Message Composition

`type(scope): subject`

**Types:** Use any valid type from the Conventional Commits spec: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`, `revert`, `build`, `ci`, `perf`, etc. If commitlint config defines `type-enum`, restrict to those values. For breaking changes, append `!` to the type (`feat!`, `fix!`) and add a `BREAKING CHANGE:` footer.

**Scope detection priority:**

1. **commitlint `scope-enum`** — if configured, map files to the closest matching value
2. **Monorepo workspace** — if `pnpm-workspace.yaml`, `packages/*/`, or `apps/*/` exist, use the workspace package name
   - `packages/auth/src/login.ts` → `auth`
   - `apps/web/components/Button.tsx` → `web`
3. **Directory-derived** — strip common prefixes (`src/`, `lib/`, `app/`, `source/`) and take the first meaningful segment
   - `src/auth/login.ts` → `auth`
   - `lib/utils/format.ts` → `utils`
4. **Well-known top-level dirs** — `config/`, `docs/`, `scripts/`, `.github/` map to their directory name
5. **Markdown files** — `*.md` → `docs`
6. **Fallback** — omit scope if no match and commitlint allows it

**Commit body (include when changes are non-trivial):**

The body explains the _why_ behind each change — decisions made, trade-offs chosen, context that the subject line can't convey.

Compose the body from these sources, in priority order:

1. **Conversation history** — if the user explained a decision or rationale earlier in the session, that is the primary source. Capture their words faithfully.
2. **Git diff** — run `git diff HEAD <file>` (or `git diff --cached <file>` for staged files) to infer decisions from the actual code changes.

Format as a short paragraph or per-file bullets (72 chars per line):

```
feat(auth): replace timeout-based retry with async/await

- login.ts: removed setTimeout retry loop; async/await eliminates the
  race condition when token refresh and login fired simultaneously
- middleware.ts: aligned error handling to propagate the new async pattern
```

Omit the body only for trivial, self-explanatory changes (typo fixes, dependency bumps, generated file updates).

### 7. Validate Messages

**commitlint** (Node project):

```bash
echo "type(scope): description" | <pkg-prefix> commitlint
```

**commitizen** (Python project):

```bash
cz check --commit-msg "type(scope): description"
```

**If validation fails:**

- Show error
- Suggest correction
- Regenerate with valid values
- Don't present until all pass

### 8. Present Plan

```
Branch: feat/my-feature

Config: types: feat,fix,test | scopes: auth,quotes,helpers | max: 72

Proposed Commits:

1. feat(auth): add JWT refresh mechanism
   Files: src/auth/token-refresh.ts, src/auth/middleware.ts
   Body:
   - token-refresh.ts: introduced sliding expiry window to match API contract
   - middleware.ts: injected refresh hook before request retry

2. test(auth): add token refresh tests
   Files: src/auth/__tests__/token-refresh.test.ts

Validated against commitlint

Proceed?
```

Wait for approval.

### 9. Execute (if approved)

Stage files only when needed:

- **Scenarios 1 & 3** (unstaged files): `git add <files>` before committing.
- **Scenario 2** (already staged): skip `git add` — files are already in the index. Re-adding them could inadvertently capture unstaged changes in those same files.

Commit using a heredoc to reliably handle special characters, bullet points, and multi-line bodies:

```bash
git commit -F - << 'EOF'
type(scope): subject

body line 1
body line 2
EOF
```

For breaking changes, include the footer after a blank line following the body:

```bash
git commit -F - << 'EOF'
feat!(auth): subject

body

BREAKING CHANGE: description
EOF
```

Then verify with:

```bash
git status
```

Never use `--no-verify` or `git add -A`.

## Scope Detection Examples

**Standard project:**

```
src/auth/login.ts        → auth
src/utils/format.ts      → utils
config/jest.config.js    → config
README.md                → docs
```

**Monorepo (packages/ or apps/):**

```
packages/auth/src/login.ts        → auth
packages/ui/components/Button.tsx → ui
apps/web/pages/index.tsx          → web
apps/api/routes/users.ts          → api
```

**commitlint scope-enum configured:**

```
Any file → mapped to nearest matching configured scope
```

## Edge Cases

**Empty message:** Prompt for description

**No scope match:** Omit scope if allowed, or use generic from path

**Mixed changes:** Separate by type (feat/test/docs)

**Large changesets (10+ proposed commits):** Warn and offer to consolidate related scopes before proceeding

**Untracked files:** Include if intentional (not gitignored/temp)

**Breaking changes:** Use `feat!` or `fix!` in the subject; always add `BREAKING CHANGE: <description>` as a footer

## Safety Features

- Strict branch protection (main/master/release/develop)
- Node.js and Python environment auto-detection
- Dynamic validation: commitlint (Node) or commitizen (Python), cross-platform
- Monorepo workspace scope detection
- Test/implementation separation
- User authorization required
- No hook bypassing
- Conflict detection

## Key Patterns

**Group by type+scope (many files, one commit):**

```
Files: src/auth/login.ts, src/auth/session.ts, src/auth/token.ts
Result: 1 commit → feat(auth): ...
```

**Separate tests from code:**

```
BAD (1 commit):
- src/auth/login.ts
- src/auth/__tests__/login.test.ts

GOOD (2 commits):
1. feat(auth): enhance login
   - src/auth/login.ts
2. test(auth): add login tests
   - src/auth/__tests__/login.test.ts
```

**Multiple scopes:**

```
Changes: auth files + docs
Result: 2 commits (feat(auth) + docs(docs))
```

**Breaking change:**

```
feat!(auth): remove legacy session API

BREAKING CHANGE: session.get() and session.set() are removed;
use the new SessionManager class instead.
```

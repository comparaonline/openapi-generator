---
name: writing-pull-request-descriptions
description: >-
  Creates and edits pull request descriptions that explain the reasoning and
  architectural decisions behind a change. Picks the right template
  (.github/pull_request_template.md if present, otherwise a structured default),
  writes a Conventional Commits title, and produces a description focused on the
  "why" rather than the "what". Use when the user wants to open, create, or
  draft a pull request or merge request — including "open a PR", "put up a pull
  request", "submit this for review", "write the PR description", "create a
  merge request", or "my feature is ready to merge". Also triggers when the user
  says "yes", "go ahead", "sounds good", or "ok" and the conversation is about
  creating a PR.
metadata:
  version: 1.2.0
  owner: sebas
  team: dev
  dependencies: 'git, gh CLI'
---

# Create Pull Request

This skill helps you create well-structured pull requests that communicate not just what changed, but why it changed. Good PR descriptions help reviewers understand your reasoning, make better suggestions, and serve as documentation for future developers.

## Workflow

### Step 1: Understand the Context

Before writing anything, understand what changed and why. This context helps you write a PR description that tells the story behind the code.

Gather information about the current branch and changes:

```bash
git branch --show-current
git log origin/release..HEAD --oneline
git diff origin/release...HEAD
```

**Why this matters:** The branch name often hints at the type of change, commit messages show the progression of work, and the diff reveals the full scope of changes. Understanding all three helps you write accurate titles and descriptions.

Check if the project has a PR template (GitHub accepts both casing variants):

```bash
find .github -maxdepth 2 -iname "pull_request_template.md" 2>/dev/null | head -1 | xargs cat 2>/dev/null
```

If the file does not exist (command returns empty), use the default template defined in Step 4.

### Step 2: Get Valid Commit Conventions

Read the commitlint configuration to see what types and scopes are allowed:

```bash
cat commitlint.config.js
```

Extract the valid types (feat, fix, chore, etc.) and scopes (auth, orders, vehicles, etc.) from the configuration. Using the correct scope helps maintain consistency across the codebase and makes PRs easier to find later.

### Step 3: Craft the PR Title

Create a title following this format: `<type>(<scope>): <description>`

**Components:**

- **Type**: Choose from the types in commitlint.config.js (feat, fix, chore, refactor, docs, test)
- **Scope**: Use a scope from the config that best describes the affected area (e.g., auth, orders, vehicles, payments)
- **Description**: Brief, imperative summary of the change (e.g., "add retry logic" not "added retry logic")

**Constraints:**

- Total length under 100 characters (enforced by commitlint)
- Subject should not end with a period
- Use lowercase for type and scope

**How to choose:**

- `feat`: New functionality or enhancement
- `fix`: Bug fix
- `chore`: Maintenance tasks (deps updates, config changes)
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `docs`: Documentation changes

### Step 4: Write the PR Description

If the project has a `.github/pull_request_template.md`, follow its structure exactly.

If not, read and use the default template from [`template.md`](template.md) in this skill's directory.

**Guidance for each section:**

**Problem:** Write 2-3 sentences explaining what breaks or is missing. Focus on the business value or user impact, not implementation details.

Good: "Fix SOAP policy issuance failures for Chilean motorcycles due to incorrect plate format."
Weak: "Change the plate normalization function."

**Solution:** This is the most important part. Explain WHY you made the decisions you made, not just WHAT you changed. Reviewers can see the diff — they need the description to understand your reasoning.

Focus on:

- **Architectural decisions**: Why did you structure it this way?
- **Alternatives considered**: What other approaches did you evaluate and why did you reject them?
- **Trade-offs**: Pros and cons of your approach.
- **Non-obvious choices**: Anything that might make a reviewer wonder "why did they do it this way?"

**What to avoid:**

- Line-by-line code walkthroughs (the diff shows this)
- Obvious changes that speak for themselves
- Repeating what's already in commit messages
- Implementation details better suited for code comments

**Required sections:** Problem, Solution, How to Test — always include these.

**Optional sections — omit entirely if there is nothing meaningful to say:**
- **Impact / Risks**: Include only when there are migrations, breaking changes, performance concerns, or areas of elevated risk.
- **Related**: Include only when linking to an issue or ticket adds real context. A bare `Closes: #N` with no explanation is rarely worth including.

### Step 5: Present Draft for Review

Before creating the PR, show the user what you're about to submit. This gives them a chance to request changes before it's published.

Present the draft like this:

```
**Title:** `type(scope): description`

**Description:**
[Show the complete PR body, formatted as it will appear in GitHub]

Does this look good, or would you like me to adjust anything?
```

Wait for their confirmation or feedback before proceeding.

### Step 6: Create the PR

Once the user approves, detect the repository's default base branch, then push and create the PR:

```bash
# Detect the default branch from the remote
BASE=$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || git remote show origin 2>/dev/null | awk '/HEAD branch/ {print $NF}')

if [ -z "$BASE" ]; then
  echo "Could not detect the default base branch. Please enter it manually (e.g. main):" >&2
  read -rp "Base branch: " BASE
  [ -z "$BASE" ] && echo "No base branch provided; aborting." >&2 && exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "Could not detect the current branch (you may be in a detached HEAD state)." >&2
  read -rp "Please enter the branch name to push: " CURRENT_BRANCH
  [ -z "$CURRENT_BRANCH" ] && echo "No branch provided; aborting." >&2 && exit 1
fi
git push -u origin "$CURRENT_BRANCH"
gh pr create --title "title" --body "description" --base "$BASE" --assignee @me
```

**Important notes:**

- Always detect the base branch dynamically — repos use `main`, `master`, `release`, `develop`, etc.
- Use `--assignee @me` to automatically assign the PR to yourself (the logged-in user)
- Use `gh pr create` (not browser-based PR creation) for consistency
- The `-u` flag sets up tracking so future pushes are simpler

After creation, `gh` will output the PR URL. Share this with the user so they can view it in GitHub.

### Edge Cases to Handle

**No changes to push:**
If the branch is already pushed and up to date, `git push` will report "Everything up-to-date". This is fine - just proceed with `gh pr create`.

**Already on the base branch:**
If the user is on the same branch as the detected base branch, you can't create a PR. Ask them which feature branch they want to use, or suggest creating one based on the changes.

**PR already exists:**
If `gh pr create` reports a PR already exists for this branch, tell the user and provide the existing PR URL. Ask if they want to update the existing PR or create a new branch.

## Examples

### Example 1: Feature Addition

**Title:** `feat(payments): add retry logic for failed transactions`

**Full PR Body:**

```markdown
## Problem

Payment failures spike during provider outages with no recovery mechanism. Users must manually retry, leading to drop-offs and support tickets.

## Solution

Implemented automatic retry with exponential backoff for transient errors. Chose exponential backoff over fixed-interval retries because it reduces provider load during incidents. Capped at 3 retries based on analysis showing 95% of transient failures resolve within 30 seconds.

Considered a job queue for retries, but opted for in-process retries to reduce latency — most failures resolve within seconds and the queue would add unnecessary complexity. Added idempotency keys to prevent duplicate charges if a transaction succeeds on the provider side but we don't receive the response.

## How to Test

1. Simulate a provider timeout using the mock server flag `PAYMENT_PROVIDER=flaky`
2. Trigger a payment — observe it retries up to 3 times in logs
3. Confirm no duplicate charges appear in the provider dashboard

## Related

Closes: #412
```

**Why this works:**

- Problem clearly states business impact, not just technical description
- Solution explains the "why" behind exponential backoff and mentions the rejected alternative
- Calls out the idempotency key decision and its importance
- How to Test gives concrete, reproducible steps

### Example 2: Bug Fix

**Title:** `fix(vehicles): normalize Chilean motorcycle plates to 6 characters`

**Full PR Body:**

```markdown
## Problem

SOAP policy issuance fails for Chilean motorcycles. External SOAP services expect plates of exactly 6 characters, but our system sends plates with varying lengths due to legacy data inconsistencies.

## Solution

Normalize plates to 6 characters via zero-padding before sending to the SOAP service. Chose normalization over strict validation because our database contains format variations from legacy imports — strict validation would block policy renewals for thousands of existing records and require a manual data cleanup.

Applied padding only for Chilean motorcycles (not cars or other countries) to avoid unintended side effects.

## How to Test

1. Find a Chilean motorcycle policy with a plate shorter than 6 characters in staging
2. Trigger policy issuance — confirm it succeeds
3. Verify the SOAP request log shows the plate zero-padded to 6 characters

## Impact / Risks

Only affects Chilean motorcycle plate formatting. No migration needed — normalization happens at runtime.
```

**Why this works:**

- Problem explains both the symptom and the root cause
- Solution explains the trade-off between normalization vs. validation with concrete consequences
- Calls out the scope limitation (only Chilean motorcycles) to prevent reviewer concern about side effects

## Important Rules

- **Detect the base branch dynamically** — never assume `main`, `master`, `release`, or `develop`; repos differ
- **All content must be in English** - titles, descriptions, comments, everything
- **Follow the template structure** - use the exact sections from `.github/pull_request_template.md`
- **Focus on "why" not "what"** - reviewers can read the diff to see what changed
- **Keep descriptions concise but complete** - respect reviewer time while providing necessary context

## Tips for Great PR Descriptions

**Think like a reviewer:** What context would help someone understand your decisions? What questions might they have? Address those proactively.

**Tell the story:** Your commits show the journey, but the PR description should tell the coherent story of what you accomplished and why.

**Future-proof:** Six months from now, someone might wonder why this works the way it does. Your PR description will be their answer (since it's preserved in GitHub history).

**Don't assume context:** Not every reviewer worked on the original design or understands the business requirements. Provide enough background to make the PR self-contained.

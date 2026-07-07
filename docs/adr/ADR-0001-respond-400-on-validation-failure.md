# ADR-0001: Respond 400 directly on validation failure instead of `throw` + `next(err)`

**Status:** Accepted
**Date:** 2026-07-07
**Deciders:** Sebastián Contreras (implementer), Enzo Martini (reporter, issue #16)

---

## Context and Problem Statement

`@comparaonline/openapi-generator` ships an Express validation middleware
(`schemaMiddleware` in `src/create-handler.ts`). Since the first version (#1/#2)
it validated the request and, on failure, did `throw new ExceptionError(400, …)`
caught by `catch (e) { return next(e) }`. PR #10 added the Zod branch and
duplicated the same pattern. A failed validation therefore reached the
consumer's Express error handler as a delegated error.

In Express, any `next(err)` with a truthy error is intercepted by the dd-trace
instrumentation, which marks the middleware span with `error=1` **at the moment
of `next(err)`** — before any consumer code runs. As a result, every controlled
`400` (invalid client input, expected behavior) produces an error span in APM
and creates issues in Error Tracking, even though the service did not fail. In
`users` (production, 24h) this was ~1100 error spans from validation messages
like `"body" must contain at least one of [phone, email]`.

Because dd-trace marks the span inside the library middleware, this **cannot be
mitigated on the consumer side** except by disabling all middleware spans
(`tracer.use('express', { middleware: false })`), which sacrifices per-middleware
timing in the flame graph. A review of the four known consumers (`users`,
`login-service`, `offer-builder`, `order-orchestrator`) confirmed that all four
are affected — each also logs the validation `ExceptionError` at error level in
its own error handler — and that none of them do anything in the error handler
beyond logging and responding. The consumer set is closed and fully audited.

## Decision Drivers

- A `4xx` from validation is a client error and must not be recorded as a service
  error in APM: eliminate the ~1100 error spans/day in `users` and the equivalent
  error-level logs across the four consumers.
- The fix must be central: the `next(err)` lives inside the library, so consumers
  cannot fix it without duplicating a wrapper in every repo (DRY violation) — and
  the duplicate would still run after the span is already marked.
- Preserve per-middleware timing in the APM flame graph (do not disable middleware
  spans).
- Preserve the existing response contract for the four known consumers:
  HTTP `400` with body `{ message, code: 'bad-request' }`.
- Minimize consumer churn: no per-route refactor. `login-service` uses the
  positional `createHandler(schema)` form in 36 of 43 routes, so any per-route
  option would force a positional→object rewrite.
- The consumer set is known and closed (4 repos, all reviewed), which makes a
  breaking change low-risk.

## Considered Options

- **Option A:** Respond `400` directly in the middleware, as the new default
  (breaking, `2.0.0`).
- **Option B:** Add a configurable opt-in (flag or custom handler) while keeping
  `next(err)` as the default (non-breaking, `1.2.0`).
- **Option C:** Leave the library unchanged; each consumer disables dd-trace
  middleware spans (`tracer.use('express', { middleware: false })`).

## Decision Outcome

**Chosen option:** Option A — respond `400` directly by default, because the
`next(err)` that pollutes APM lives inside the library and the consumer set is
closed and audited, so the configurability of Option B adds ceremony without
value while Option C degrades observability for everyone.

Validation failures now do `res.status(400).json({ message, code: 'bad-request' })`
and `return` without calling `next()`. Genuine unexpected errors are still
delegated with `next(err)` inside the same `try/catch`, so real server errors
keep propagating to the consumer's error handler and keep appearing in APM.

### Consequences

**Positive:**
- Removes ~1100 APM error spans/day in `users` and the equivalent across the
  other three consumers, plus the error-level logs each consumer emitted for
  client `400`s.
- Central fix: no per-consumer duplication; future consumers get correct behavior
  for free.
- Per-middleware APM timing is preserved.
- Response contract (`400`, `{ message, code }`) is unchanged for consumers that
  did not add a `source` field.

**Negative:**
- Breaking change (`2.0.0`): consumers on `^1.x` do not receive it until they bump
  the range to `^2.0.0`.
- The response body drops the constant `source: 'unknown'` for `users` and
  `order-orchestrator` (their error handlers added it; it was always `'unknown'`
  for validation errors).
- Consumers that intentionally wanted their own error handler to format validation
  `400`s lose that hook. None of the four current consumers do — verified.

**Neutral / requiring follow-up:**
- Four consumer PRs are needed to bump `^1.0.x` → `^2.0.0` (`users`,
  `login-service`, `offer-builder`, `order-orchestrator`).
- `ExceptionError` became dead code and was removed from `create-handler.ts`.
- Notion RFC cross-check for existing observability/validation conventions was
  pending at authoring time (Notion API rate-limited); revisit if a related RFC
  exists.

---

## Options Analysis

### Option A: Respond 400 directly (chosen)

The middleware responds `res.status(400).json({ message, code: 'bad-request' })`
on validation failure and returns without `next()`. Shipped as `2.0.0`.

**Pros:**
- Kills the APM error span at its source (no `next(err)` for validation).
- No configuration surface, no per-route changes in consumers.
- Also removes the redundant error-level logs in every consumer's error handler.
- Correct-by-default for future consumers.

**Cons:**
- Breaking change; requires a major version bump and consumer range bumps.
- Removes the consumer's ability to intercept validation `400`s via its error
  handler (acceptable: no current consumer relies on it).

### Option B: Configurable opt-in (flag or custom handler)

Keep `next(err)` as default; add `respondOnValidationError` or `onValidationError`
to `Params` (and/or a global setter). Shipped as `1.2.0`, non-breaking.

**Pros:**
- No breaking change; consumers opt in when ready.
- Leaves the door open for hypothetical external consumers who want the old flow.

**Cons:**
- A per-route flag in `Params` cannot reach the positional `createHandler(schema)`
  form, which dominates `login-service` — forcing a positional→object rewrite.
- Still requires touching all four consumers (to bump + activate), so the opt-in
  buys nothing over Option A for the closed, known consumer set.
- Adds permanent configuration surface and two code paths to maintain (YAGNI).

### Option C: Disable dd-trace middleware spans in consumers

Leave the library as-is; each consumer sets
`tracer.use('express', { middleware: false })`.

**Pros:**
- No library change.

**Cons:**
- Sacrifices per-middleware timing in the flame graph for the whole service.
- Must be repeated in every consumer and every future consumer (DRY violation).
- Treats the symptom (span noise) rather than the cause (a `4xx` modeled as an
  exception).
- Does not remove the redundant error-level logs in each consumer's error handler.

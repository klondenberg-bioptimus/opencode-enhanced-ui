# OpenCode UI Official SDK V2 Migration Design

## Goal

Replace the handwritten SDK facade in the VS Code extension with an official `@opencode-ai/sdk/v2`-driven adapter while keeping the current extension behavior and minimizing churn across the rest of the codebase.

## Scope

This slice includes:

1. Reworking `src/core/sdk.ts` so it is backed by official `@opencode-ai/sdk/v2` types and client construction
2. Preserving the current extension-facing `Client` shape where practical through a thin compatibility adapter
3. Exporting local semantic aliases such as `SessionInfo`, `SessionMessage`, and `SessionEvent` from official SDK types instead of handwritten copies
4. Adding adapter-focused tests and regression coverage so the migration can proceed with TDD

This slice does not include:

- Migrating the whole extension to the root-package `{ path, query, body }` SDK style
- Reworking unrelated panel, sidebar, or runtime behavior
- Adding new UI features simply because the official SDK exposes more endpoints
- Refactoring the rest of the extension to use raw generated OpenAPI type names directly

## Product Decisions

### 1. The first target is official `v2`, not the root-package API

The extension currently imports `@opencode-ai/sdk/v2/client`, and its call sites already resemble the `v2` surface closely.

Behavior:

- The migration should target the official `v2` client and generated `v2` types first
- The extension should not switch to the root-package API shape in the same slice
- Future migration to the root-package API remains possible after the local facade is stabilized

This keeps the migration incremental and reduces avoidable risk.

### 2. `src/core/sdk.ts` remains the only compatibility boundary

The extension already centralizes its SDK surface in one file. That file should become the sole place that knows about any mismatch between official `v2` details and extension expectations.

Behavior:

- `src/core/sdk.ts` should directly own official SDK imports and client creation
- `src/core/`, `src/panel/`, and `src/sidebar/` should continue consuming the local `Client` contract
- Any compatibility mapping such as boolean-to-string query conversion or stream-shape normalization should stay inside `src/core/sdk.ts`

This preserves local architecture and minimizes file churn.

### 3. Local semantic type names stay for now

The extension uses names such as `SessionInfo`, `MessageInfo`, `SessionMessage`, `PromptPartInput`, and `SessionEvent` pervasively. Renaming everything to generated SDK names would create broad churn without immediate product value.

Behavior:

- Keep existing exported semantic names in `src/core/sdk.ts`
- Back those names with official `v2` types or small composed aliases
- Remove handwritten structural copies where an official type already exists

This improves correctness while keeping the rest of the code readable and stable.

### 4. Compatibility wrappers should be thin and explicit

The new adapter should not hide large behavior changes or invent new abstractions. It should only bridge the few mismatches that are needed to keep existing callers working.

Behavior:

- Wrap only the areas where the current extension depends on a different shape than the official client exposes
- Avoid introducing silent data transforms beyond the minimum needed for compatibility
- Keep wrappers small enough that adding future official endpoints is still straightforward

This prevents the new adapter from becoming another long-lived handwritten fork.

## Architecture

The migration should keep the existing extension boundaries intact:

- `src/core/sdk.ts` owns all official SDK imports, exported aliases, and adapter logic
- `src/core/workspace.ts` continues constructing one SDK client per runtime through the local `client()` helper
- `src/core/events.ts`, `src/core/session.ts`, `src/core/commands.ts`, `src/panel/provider/`, and `src/sidebar/` continue consuming the local `Client` interface

The preferred flow is:

1. Create the official `v2` client in `src/core/sdk.ts`
2. Wrap it in a compatibility object that matches the extension's current runtime expectations
3. Re-export official `v2` types through local semantic aliases
4. Keep current callers unchanged unless a real type mismatch forces a small cleanup
5. Use adapter tests and regression tests to verify that existing panel/sidebar/runtime flows still compile and behave the same

## Compatibility Design

### Type exports

The handwritten structural types in `src/core/sdk.ts` should be replaced with official types or aliases built from official types.

Expected mapping direction:

- `SessionInfo` maps to official `Session`
- `SessionStatus` maps to official `SessionStatus`
- `PermissionRequest` maps to official `PermissionRequest`
- `QuestionRequest` maps to official `QuestionRequest`
- `Todo` maps to official `Todo`
- `FileDiff` maps to official `FileDiff`
- `McpStatus` maps to official `McpStatus`
- `McpResource` maps to official `McpResource`
- `LspStatus` maps to official `LspStatus`
- `CommandInfo` maps to official `Command`
- `AgentInfo` maps to official `Agent`
- `ProviderInfo` and provider/model helper aliases map to the official provider/model structures
- `MessageInfo` maps to official `Message`
- `MessagePart` maps to official `Part`
- `SessionMessage` remains a local alias for `{ info: Message; parts: Part[] }`
- `PromptPartInput` maps to the official prompt part input union

### Client construction

The local `client(url, dir)` function should continue returning the extension-facing `Client`, but that `Client` should now be backed by the official `OpencodeClient`.

Behavior:

- Continue creating the runtime client with `baseUrl`, `directory`, and `throwOnError: true`
- Avoid `unknown as Client` coercion over a handwritten shape
- Prefer deriving `Client` from the official client type and then layering only the needed compatibility members

### Wrapper responsibilities

The compatibility adapter should initially cover these areas:

#### Event subscribe shape

Current extension code expects:

- `rt.sdk.event.subscribe(...).stream`

The adapter should normalize the official SSE response into that shape if the generated client differs.

#### Experimental resources

Current extension code expects:

- `sdk.experimental.resource.list(...)`

The adapter should preserve this access path even if the official generated layout differs internally.

#### File search `dirs`

Current extension code passes:

- `dirs?: boolean`

The official `v2` client expects a string query representation. The adapter should convert:

- `true` to `"true"`
- `false` to `"false"`
- `undefined` to `undefined`

#### Provider and model aliases

The current panel snapshot logic depends on lightweight provider/model aliases. The adapter layer should expose those aliases from official types without changing the consuming code’s expectations.

## File-Level Design

### `src/core/sdk.ts`

- Replace handwritten type declarations with official imports and aliases
- Define the extension-facing `Client` around the official `OpencodeClient`
- Add tiny wrappers for `find.files`, `event.subscribe`, and any nested resource helpers required for compatibility
- Keep the public exports stable enough that most current imports do not need to move

### `src/core/workspace.ts`

- Keep the `client(url, dir)` call site the same unless official typing requires a tiny adjustment
- Do not move adapter logic here

### `src/core/events.ts`

- Expect no behavior change
- Only accept a small type adjustment if the event stream item shape becomes stricter

### `src/core/capabilities.ts`

- Update any probing types that currently rely on loose `any` or the handwritten SDK shape
- Keep the existing probing strategy unchanged

### `src/panel/provider/actions.ts`

- Expect no functional behavior change
- Only adjust types if official input unions require narrower values

### `src/panel/provider/snapshot.ts`

- Keep current snapshot assembly behavior
- Update only the provider/model alias handling if official types expose stricter fields

## Risks And Mitigations

### Risk: Hidden mismatches between handwritten and official types break compile-time assumptions

Mitigation:

- Replace handwritten copies with official aliases in `src/core/sdk.ts`
- Add targeted type-focused regression tests around the adapter surface
- Run full type-check, lint, compile, and test validation before calling the migration done

### Risk: The adapter becomes another unofficial fork

Mitigation:

- Keep the wrapper limited to shape normalization only
- Avoid re-declaring large object graphs unless there is no official type to export
- Document the exact compatibility responsibilities in `src/core/sdk.ts`

### Risk: Search or event streaming breaks because of subtle generated-client differences

Mitigation:

- Add dedicated adapter tests for `find.files` parameter conversion and event subscription return shape
- Preserve the current extension-facing call contract exactly where existing modules depend on it

### Risk: Provider/model typing changes ripple into panel snapshot logic

Mitigation:

- Keep local semantic aliases for provider/model references
- Add or extend panel snapshot regression tests using official type-backed fixtures

## Testing Strategy

The migration should be implemented in strict TDD order.

### Adapter tests

Add a new focused test file for `src/core/sdk.ts` covering:

- official client creation through the local `client()` helper
- `find.files()` converting `dirs: true | false | undefined` into the official query form
- `event.subscribe()` returning the stream shape expected by `src/core/events.ts`
- `experimental.resource.list()` resolving through the compatibility path

### Regression tests

Extend existing tests to ensure the rest of the extension does not feel the migration:

- `src/test/capabilities.test.ts`
  - verify capability probing still works against the official-type-backed client shape
- `src/panel/provider/actions.test.ts`
  - verify prompt, command, shell, and revert payloads still match current expectations
- `src/panel/provider/snapshot.test.ts`
  - verify snapshot building still accepts provider/session/message fixtures backed by the new aliases

### Validation commands

Required validation after implementation:

- `bun test src/core/sdk.test.ts`
- `bun test src/test/capabilities.test.ts`
- `bun test src/panel/provider/actions.test.ts`
- `bun test src/panel/provider/snapshot.test.ts`
- `bun run test`
- `bun run check-types`
- `bun run lint`
- `bun run compile`

## Implementation Order

1. Add failing adapter tests for the official `v2`-backed `src/core/sdk.ts` surface
2. Implement the minimal official-client adapter and semantic type aliases in `src/core/sdk.ts`
3. Run targeted adapter tests until green
4. Update any impacted regression tests with official-type-backed fixtures
5. Run the full repo validation suite
6. Only then consider follow-up work to expose more official SDK capabilities

## Success Criteria

This slice is successful when:

- `src/core/sdk.ts` is backed by the official `@opencode-ai/sdk/v2` client and types instead of handwritten structural copies
- Existing extension modules continue to compile with little or no call-site churn
- The compatibility boundary is isolated to `src/core/sdk.ts`
- Adapter and regression tests protect the migration path
- The extension’s main validation commands pass after the migration

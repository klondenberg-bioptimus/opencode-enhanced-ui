# OpenCode UI Official SDK V2 Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the extension's SDK layer to the official `@opencode-ai/sdk/v2` client and types, and replace the broken local fork flow with the official `session.fork()` path.

**Architecture:** Keep `src/core/sdk.ts` as the only compatibility boundary. Re-export official `v2` types through local semantic aliases, wrap only the few mismatched surfaces the rest of the extension already depends on, and keep the rest of the extension nearly unchanged. Update the command-layer fork flow to call official `session.fork()` directly, removing the current local create-and-seed implementation.

**Tech Stack:** TypeScript, Bun test runner, VS Code extension APIs, official `@opencode-ai/sdk/v2`

---

## File Map

### New files

- `src/test/sdk-adapter.test.ts`
  - Focused tests for the official `v2` adapter surface exported by `src/core/sdk.ts`

### Modified files

- `src/core/sdk.ts`
  - Replace handwritten SDK type copies with official `v2` aliases and add the thin compatibility adapter
- `src/core/commands.ts`
  - Replace the local fork implementation with official `session.fork()`
- `src/test/commands.test.ts`
  - Cover the new official fork flow and remove tests tied to the deleted local fork helper
- `src/test/capabilities.test.ts`
  - Tighten capability fixtures to reflect the official-type-backed client shape
- `src/panel/provider/actions.test.ts`
  - Adjust fixtures only if official aliases expose stricter payload shapes
- `src/panel/provider/snapshot.test.ts`
  - Adjust fixtures only if official aliases expose stricter provider/message/session shapes

### Files expected to stay unchanged unless a test proves otherwise

- `src/core/workspace.ts`
- `src/core/events.ts`
- `src/core/session.ts`
- `src/panel/provider/actions.ts`
- `src/panel/provider/snapshot.ts`

## Chunk 1: Lock The Adapter Contract With Tests

### Task 1: Add failing tests for the official SDK adapter surface

**Files:**
- Create: `src/test/sdk-adapter.test.ts`
- Modify: `src/core/sdk.ts`

- [ ] **Step 1: Write the failing adapter tests**

```ts
import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { createClientAdapter } from "../core/sdk"

describe("sdk adapter", () => {
  test("converts find.files dirs boolean to the official v2 string query", async () => {
    let received: unknown
    const sdk = createClientAdapter({
      find: {
        files: async (input: unknown) => {
          received = input
          return []
        },
      },
    } as any)

    await sdk.find.files({
      directory: "/workspace",
      query: "src",
      dirs: true,
    })

    assert.deepEqual(received, {
      directory: "/workspace",
      query: "src",
      dirs: "true",
    })
  })

  test("returns the stream shape expected by the event hub", async () => {
    const stream = { [Symbol.asyncIterator]: async function* () {} }
    const sdk = createClientAdapter({
      event: {
        subscribe: async () => stream,
      },
    } as any)

    const result = await sdk.event.subscribe({ directory: "/workspace" })
    assert.equal(result.stream, stream)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/test/sdk-adapter.test.ts`
Expected: FAIL because `createClientAdapter` does not exist and `src/core/sdk.ts` still exposes the handwritten facade

- [ ] **Step 3: Add the minimal adapter entry points in `src/core/sdk.ts`**

```ts
export function createClientAdapter(client: OfficialOpencodeClient): Client {
  return {
    ...client,
    find: {
      ...client.find,
      files(input) {
        return client.find.files({
          ...input,
          dirs: input.dirs === undefined ? undefined : input.dirs ? "true" : "false",
        })
      },
    },
    event: {
      ...client.event,
      async subscribe(input, options) {
        const stream = await client.event.subscribe(input, options)
        return { stream }
      },
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/test/sdk-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/test/sdk-adapter.test.ts src/core/sdk.ts
git commit -m "test: lock sdk adapter contract"
```

### Task 2: Add failing tests for official type-backed aliases

**Files:**
- Modify: `src/test/sdk-adapter.test.ts`
- Modify: `src/core/sdk.ts`

- [ ] **Step 1: Extend the adapter tests with alias-backed fixtures**

```ts
test("exports local semantic aliases backed by official v2 shapes", () => {
  const session: SessionInfo = {
    id: "session-1",
    slug: "session-1",
    projectID: "project-1",
    directory: "/workspace",
    title: "Session 1",
    version: "1",
    time: {
      created: 1,
      updated: 1,
    },
  }

  assert.equal(session.id, "session-1")
  assert.equal(session.directory, "/workspace")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/test/sdk-adapter.test.ts`
Expected: FAIL because `SessionInfo` and related aliases still come from handwritten shapes rather than official `v2` exports

- [ ] **Step 3: Replace handwritten SDK type copies with official aliases**

```ts
export type SessionInfo = Session
export type SessionStatus = OfficialSessionStatus
export type MessageInfo = Message
export type MessagePart = Part
export type SessionMessage = {
  info: Message
  parts: Part[]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/test/sdk-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/sdk.ts src/test/sdk-adapter.test.ts
git commit -m "refactor: back sdk aliases with official v2 types"
```

## Chunk 2: Replace The Fork Flow With Official `session.fork()`

### Task 3: Add failing tests for the new fork command behavior

**Files:**
- Modify: `src/test/commands.test.ts`
- Modify: `src/core/commands.ts`

- [ ] **Step 1: Replace the old local fork-helper test with command-flow tests**

```ts
test("forkSessionMessage uses official session.fork with the selected message id", async () => {
  let forked: unknown
  const result = await forkSessionMessage({
    runtime: {
      workspaceId: "file:///workspace-a",
      dir: "/workspace-a",
      name: "workspace-a",
      state: "ready",
      sdk: {
        session: {
          messages: async () => ({
            data: [{
              info: {
                id: "msg-1",
                sessionID: "session-root",
                role: "user",
                time: { created: 1 },
              },
              parts: [],
            }],
          }),
          fork: async (input: unknown) => {
            forked = input
            return { data: { id: "session-fork", directory: "/workspace-a", title: "Fork", time: { created: 2, updated: 2 } } }
          },
        },
      },
    } as any,
    current: { workspaceId: "file:///workspace-a", dir: "/workspace-a", sessionId: "session-root" },
    messageID: "msg-1",
  })

  assert.deepEqual(forked, {
    sessionID: "session-root",
    directory: "/workspace-a",
    messageID: "msg-1",
  })
  assert.equal(result?.id, "session-fork")
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/test/commands.test.ts`
Expected: FAIL because the command still creates a new session locally and there is no exported official-fork helper to test

- [ ] **Step 3: Extract the minimal official fork helper from the command logic**

```ts
export async function forkSessionMessage(input: {
  runtime: WorkspaceRuntime
  current: WorkspaceRef & { sessionId: string }
  messageID: string
}) {
  const messages = await input.runtime.sdk!.session.messages({
    sessionID: input.current.sessionId,
    directory: input.runtime.dir,
  })

  const message = messages.data?.find((item) => item.info.role === "user" && item.info.id === input.messageID)
  if (!message) {
    return undefined
  }

  return (await input.runtime.sdk!.session.fork({
    sessionID: input.current.sessionId,
    directory: input.runtime.dir,
    messageID: input.messageID,
  })).data
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/test/commands.test.ts`
Expected: PASS for the new fork helper test and FAIL for any remaining test still tied to `buildForkSessionCreateInput`

- [ ] **Step 5: Commit**

```bash
git add src/core/commands.ts src/test/commands.test.ts
git commit -m "test: cover official fork command flow"
```

### Task 4: Wire the registered VS Code command to the official fork helper

**Files:**
- Modify: `src/core/commands.ts`
- Modify: `src/test/commands.test.ts`

- [ ] **Step 1: Add a failing test that the command opens the returned forked session**

```ts
test("fork command opens the returned official fork session", async () => {
  let opened: unknown
  await runForkSessionMessageCommand({
    forkSession: async () => ({
      id: "session-fork",
      directory: "/workspace-a",
      title: "Fork",
      time: { created: 2, updated: 2 },
    }),
    openSession: async (_workspace, session) => {
      opened = session
    },
  })

  assert.deepEqual(opened, {
    id: "session-fork",
    directory: "/workspace-a",
    title: "Fork",
    time: { created: 2, updated: 2 },
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/test/commands.test.ts`
Expected: FAIL because the command still routes through `panels.openWithSeed(...)`

- [ ] **Step 3: Replace the command implementation with official fork opening**

```ts
const forked = await forkSessionMessage({
  runtime: rt,
  current,
  messageID,
})

if (!forked) {
  await vscode.window.showInformationMessage("The selected message is no longer available.")
  return
}

void capabilities.getOrProbe(rt.workspaceId)
await tabs.openSession(workspaceRef(rt), forked, resolveNewSessionOpenColumn())
void sessions.refresh(rt.workspaceId, true)
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/test/commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commands.ts src/test/commands.test.ts
git commit -m "fix: use official sdk session fork"
```

### Task 5: Remove the obsolete local fork helpers and imports

**Files:**
- Modify: `src/core/commands.ts`
- Modify: `src/test/commands.test.ts`

- [ ] **Step 1: Add a failing test that guards against the old create-and-seed path**

```ts
test("fork flow no longer depends on local session creation input helpers", async () => {
  assert.equal("buildForkSessionCreateInput" in await import("../core/commands"), false)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/test/commands.test.ts`
Expected: FAIL because `buildForkSessionCreateInput` is still exported

- [ ] **Step 3: Delete the obsolete fork-only helper and unused imports**

```ts
// Remove:
// - buildForkSessionCreateInput()
// - restoredPromptPartsFromMessage import in commands.ts
// - panels.openWithSeed fork-specific branch
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/test/commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/commands.ts src/test/commands.test.ts
git commit -m "refactor: remove local fork seed path"
```

## Chunk 3: Tighten Regression Coverage And Validate The Migration

### Task 6: Update capability and panel regression fixtures to the official alias surface

**Files:**
- Modify: `src/test/capabilities.test.ts`
- Modify: `src/panel/provider/actions.test.ts`
- Modify: `src/panel/provider/snapshot.test.ts`

- [ ] **Step 1: Add or update failing fixture assertions where official aliases are stricter**

```ts
test("capability probes still accept the adapted sdk client shape", async () => {
  const capabilities = await probeRuntimeCapabilities({
    dir: "/workspace",
    sessions: new Map(),
    sdk: createClientAdapter(mockOfficialClient),
  })

  assert.equal(capabilities.sessionSearch, "supported")
})
```

- [ ] **Step 2: Run the targeted regression tests to verify what fails**

Run: `bun test src/test/capabilities.test.ts`
Run: `bun test src/panel/provider/actions.test.ts`
Run: `bun test src/panel/provider/snapshot.test.ts`
Expected: At least one failure or compile issue if existing fixtures no longer match the official alias surface

- [ ] **Step 3: Make the minimal fixture or helper updates**

```ts
// Keep behavior unchanged.
// Only add fields that official aliases now require, or narrow mocks so they match the new adapter contract.
```

- [ ] **Step 4: Run the targeted regression tests to verify they pass**

Run: `bun test src/test/capabilities.test.ts`
Run: `bun test src/panel/provider/actions.test.ts`
Run: `bun test src/panel/provider/snapshot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/test/capabilities.test.ts src/panel/provider/actions.test.ts src/panel/provider/snapshot.test.ts
git commit -m "test: align sdk migration regressions"
```

### Task 7: Run the full verification suite and only stop on green

**Files:**
- Modify: no additional source changes unless verification exposes a real failure

- [ ] **Step 1: Run all targeted tests**

Run: `bun test src/test/sdk-adapter.test.ts`
Run: `bun test src/test/commands.test.ts`
Run: `bun test src/test/capabilities.test.ts`
Run: `bun test src/panel/provider/actions.test.ts`
Run: `bun test src/panel/provider/snapshot.test.ts`
Expected: PASS

- [ ] **Step 2: Run the repo test suite**

Run: `bun run test`
Expected: PASS

- [ ] **Step 3: Run static validation**

Run: `bun run check-types`
Run: `bun run lint`
Run: `bun run compile`
Expected: PASS

- [ ] **Step 4: If any command fails, fix the smallest real issue and re-run the exact failing command first**

```ts
// No speculative cleanup.
// Fix only the failure the validation command exposed, then re-run that command before re-running the full suite.
```

- [ ] **Step 5: Commit the final migration**

```bash
git add src/core/sdk.ts src/core/commands.ts src/test/sdk-adapter.test.ts src/test/commands.test.ts src/test/capabilities.test.ts src/panel/provider/actions.test.ts src/panel/provider/snapshot.test.ts
git commit -m "feat: migrate to official sdk v2 adapter"
```

## Execution Notes

- Do not reintroduce a local fork fallback after `session.fork()` is wired in.
- Keep all compatibility behavior inside `src/core/sdk.ts`; if another file needs conversion logic, first try moving that logic into the adapter.
- Avoid broad type churn. If a local semantic alias can hide an official generated name cleanly, prefer the alias.
- For tests, prefer realistic official-shape fixtures over `as any` unless the fixture is intentionally incomplete for one narrow branch.

Plan complete and saved to `docs/superpowers/plans/2026-04-14-opencode-ui-official-sdk-v2-migration.md`. Ready to execute?

# OpenCode UI Session Picker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a panel-native `/sessions` picker that switches sessions in place and exposes the core sidebar session actions from inside the session panel.

**Architecture:** Treat `/sessions` as a local composer action that opens a webview dialog. The host builds a lightweight picker payload from `SessionStore`, `SessionTagStore`, and the current panel snapshot, then the webview handles scope switching, search, grouping, and inline actions while host-side action helpers perform the actual mutations and refresh the picker payload.

**Tech Stack:** TypeScript, React TSX webviews, Bun tests, VS Code extension host APIs.

---

## Chunk 1: Lock The Expected `/sessions` Entry Point

### Task 1: Describe `/sessions` as a local composer action

**Files:**
- Modify: `src/panel/webview/app/composer-actions.test.ts`
- Modify: `src/panel/webview/app/composer-submit.test.ts`
- Modify: `src/panel/webview/app/composer-actions.ts`

- [ ] **Step 1: Write the failing slash-action test**

Add a test that expects `resolveComposerSlashAction("/sessions", [])` to return a local session-picker action.

- [ ] **Step 2: Run the targeted slash-action test and verify failure**

Run: `bun test src/panel/webview/app/composer-actions.test.ts`
Expected: FAIL because `/sessions` is not recognized yet.

- [ ] **Step 3: Write the failing submit-path test**

Add a test that expects `buildComposerHostMessage()` to keep `/sessions` off the `runSlashCommand` path.

- [ ] **Step 4: Run the targeted submit-path test and verify failure**

Run: `bun test src/panel/webview/app/composer-submit.test.ts`
Expected: FAIL because `/sessions` still falls through the normal submit path.

- [ ] **Step 5: Implement the minimal slash-action support**

Update `src/panel/webview/app/composer-actions.ts` so `/sessions` resolves to a new local action and stays local-only when no arguments are present.

- [ ] **Step 6: Re-run the targeted composer tests**

Run: `bun test src/panel/webview/app/composer-actions.test.ts src/panel/webview/app/composer-submit.test.ts`
Expected: PASS.

## Chunk 2: Lock The Picker Data Contract First

### Task 2: Write picker data and filtering tests before building the UI

**Files:**
- Create: `src/panel/webview/app/session-picker.test.tsx`
- Create: `src/panel/webview/app/session-picker.tsx`

- [ ] **Step 1: Write failing pure-data tests for picker list shaping**

Add tests for:

- excluding the current session
- `Related` scope filtering
- `Workspace` scope filtering
- grouping by day in newest-first order
- text search over title, session id, and tags
- single-tag filtering
- share versus unshare action visibility

- [ ] **Step 2: Run the picker test file and verify failure**

Run: `bun test src/panel/webview/app/session-picker.test.tsx`
Expected: FAIL because the picker helpers and component do not exist yet.

- [ ] **Step 3: Implement the minimal pure helpers and component shell**

Create `src/panel/webview/app/session-picker.tsx` with:

- picker types
- filtering helpers
- grouping helpers
- initial renderable component shell

- [ ] **Step 4: Re-run the picker test file**

Run: `bun test src/panel/webview/app/session-picker.test.tsx`
Expected: PASS for the pure helper expectations.

## Chunk 3: Add Host And Bridge Contracts

### Task 3: Describe the picker message protocol with failing tests

**Files:**
- Modify: `src/bridge/types.ts`
- Modify: `src/panel/provider/actions.test.ts`
- Modify: `src/panel/webview/app/state.ts`

- [ ] **Step 1: Add failing host-action tests for picker payload loading and refresh**

Add tests that expect host-side picker helpers to:

- build payload from workspace sessions and tags
- refresh payload after mutating actions

- [ ] **Step 2: Run the targeted host-action tests and verify failure**

Run: `bun test src/panel/provider/actions.test.ts`
Expected: FAIL because session-picker host helpers and message contracts do not exist yet.

- [ ] **Step 3: Add minimal bridge and state types**

Extend `src/bridge/types.ts` and `src/panel/webview/app/state.ts` with:

- picker payload types
- picker host messages
- picker webview messages
- normalized state shape for incoming picker payload

- [ ] **Step 4: Re-run the host-action tests**

Run: `bun test src/panel/provider/actions.test.ts`
Expected: still FAIL, but now on missing host implementation instead of missing types.

## Chunk 4: Implement Host-Side Picker Data And Actions

### Task 4: Build picker payload and action helpers with TDD

**Files:**
- Modify: `src/panel/provider/actions.ts`
- Modify: `src/core/commands.ts`
- Modify: `src/test/commands.test.ts`

- [ ] **Step 1: Write the failing shared tag-helper test**

If tag editing extraction lands in `src/core/commands.ts`, add a test that describes shared tag parsing and persistence behavior for the picker and sidebar.

- [ ] **Step 2: Run the relevant command tests and verify failure**

Run: `bun test src/test/commands.test.ts`
Expected: FAIL because the shared helper does not exist yet.

- [ ] **Step 3: Implement picker payload builder helpers in `actions.ts`**

Add helpers that:

- read sessions from the current workspace
- exclude the current session
- merge tags
- mark related sessions
- shape the payload for the webview

- [ ] **Step 4: Extract or add the shared tag-editing helper**

Refactor the existing tag edit flow so both the sidebar command path and picker path can call the same helper.

- [ ] **Step 5: Implement picker mutation helpers**

Add host-side helpers for:

- rename
- archive
- share
- unshare
- edit tags
- switch session with `panels.retarget`

- [ ] **Step 6: Re-run targeted host and command tests**

Run: `bun test src/panel/provider/actions.test.ts src/test/commands.test.ts`
Expected: PASS.

## Chunk 5: Wire The Picker Into The Panel Controller

### Task 5: Add controller coverage for open, refresh, and in-place switch

**Files:**
- Modify: `src/panel/provider/controller.test.ts`
- Modify: `src/panel/provider/controller.ts`

- [ ] **Step 1: Write failing controller tests**

Add tests that expect:

- the controller to open the picker on a dedicated webview message
- picker actions to route to the new host helpers
- session confirm to retarget the panel in place

- [ ] **Step 2: Run the controller test file and verify failure**

Run: `bun test src/panel/provider/controller.test.ts`
Expected: FAIL because picker webview messages are not handled yet.

- [ ] **Step 3: Implement minimal controller message handling**

Update `src/panel/provider/controller.ts` to:

- send picker payload into the webview
- handle picker action messages
- refresh picker state after host-side mutations

- [ ] **Step 4: Re-run the controller tests**

Run: `bun test src/panel/provider/controller.test.ts`
Expected: PASS.

## Chunk 6: Render The Picker In The Panel UI

### Task 6: Add picker UI state and dialog wiring

**Files:**
- Modify: `src/panel/webview/app/App.tsx`
- Modify: `src/panel/webview/app/state.ts`
- Modify: `src/panel/webview/status.css`

- [ ] **Step 1: Add failing picker interaction tests if the component needs them**

Extend `src/panel/webview/app/session-picker.test.tsx` with interaction-level assertions for:

- scope switching
- empty states
- row action rendering on active row

- [ ] **Step 2: Run the picker test file and verify failure**

Run: `bun test src/panel/webview/app/session-picker.test.tsx`
Expected: FAIL because the dialog wiring is not complete yet.

- [ ] **Step 3: Implement minimal `App.tsx` picker state wiring**

Add:

- `sessionPickerOpen` state
- local `/sessions` submit handling
- host-message handling for picker payload updates
- render path for `SessionPicker`

- [ ] **Step 4: Add focused picker styling**

Update `src/panel/webview/status.css` with scoped dialog rules that match the current panel picker visual system.

- [ ] **Step 5: Re-run the picker tests**

Run: `bun test src/panel/webview/app/session-picker.test.tsx`
Expected: PASS.

## Chunk 7: Validate The Integrated Flow

### Task 7: Run targeted and broader verification

**Files:**
- Modify: `src/panel/webview/app/session-picker.tsx`
- Modify: `src/panel/provider/actions.ts`
- Modify: `src/panel/provider/controller.ts`
- Modify: `src/panel/webview/app/App.tsx`

- [ ] **Step 1: Run the targeted feature test set**

Run: `bun test src/panel/webview/app/composer-actions.test.ts src/panel/webview/app/composer-submit.test.ts src/panel/webview/app/session-picker.test.tsx src/panel/provider/actions.test.ts src/panel/provider/controller.test.ts src/test/commands.test.ts`
Expected: PASS.

- [ ] **Step 2: Run the repo test suite**

Run: `bun run test`
Expected: PASS.

- [ ] **Step 3: Run type-check and lint**

Run: `bun run check-types && bun run lint`
Expected: PASS.

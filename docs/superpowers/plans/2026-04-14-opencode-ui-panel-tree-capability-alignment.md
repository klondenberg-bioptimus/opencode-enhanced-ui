# OpenCode UI Panel And Tree Capability Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the highest-value official SDK capabilities that fit the existing OpenCode UI session tree, session panel, and companion sidebar views without introducing new top-level management surfaces.

**Architecture:** Extend the existing command registry, tree item context values, panel host actions, and focused-session companion views so the plugin can manage sessions, recover auth flows, and surface workspace status through the UI users already have. Keep SDK usage centralized in existing host-side command and snapshot flows; do not add new standalone consoles or settings pages.

**Tech Stack:** TypeScript, Bun, VS Code extension APIs, React TSX webviews, OpenCode SDK v2.

---

## File Map

### Existing files expected to change

- Modify: `package.json`
- Modify: `src/core/commands.ts`
- Modify: `src/core/sdk.ts`
- Modify: `src/bridge/types.ts`
- Modify: `src/sidebar/item.ts`
- Modify: `src/sidebar/focused.ts`
- Modify: `src/sidebar/view-provider.ts`
- Modify: `src/sidebar/view-types.ts`
- Modify: `src/panel/provider/actions.ts`
- Modify: `src/panel/provider/controller.ts`
- Modify: `src/sidebar/session-view-provider.ts`
- Modify: `src/panel/provider/snapshot.ts`
- Modify: `src/panel/webview/app/App.tsx`
- Modify: `src/panel/webview/app/model-picker.tsx`
- Modify: `src/panel/webview/lib/session-meta.ts`

### Existing tests expected to change

- Modify: `src/test/commands.test.ts`
- Modify: `src/test/sidebar-provider.test.ts`
- Modify: `src/test/sidebar-task-panel.test.ts`
- Modify: `src/panel/provider/actions.test.ts`
- Modify: `src/panel/provider/controller.test.ts`
- Modify: `src/panel/webview/app/model-picker.test.ts`
- Modify: `src/panel/webview/lib/session-meta.test.ts`

### New tests likely needed

- Create: `src/test/session-capability-commands.test.ts`
- Create: `src/sidebar/focused.test.ts`

## Chunk 1: Session Actions

### Task 1: Add failing tests for rename, archive, share, and unshare workflows

**Files:**
- Modify: `src/test/commands.test.ts`
- Create: `src/test/session-capability-commands.test.ts`
- Modify: `src/test/sidebar-provider.test.ts`

- [ ] **Step 1: Add a command-helper test for rename flow**

Cover:

- prompt shown with current title
- `sdk.session.update({ title })` receives the edited title
- workspace sessions refresh after success

- [ ] **Step 2: Add a command-helper test for archive flow**

Cover:

- confirmation prompt shown
- `sdk.session.update({ time: { archived: <timestamp> } })` is called
- archived session disappears after refresh because normal `session.list` excludes archived items

- [ ] **Step 3: Add a command-helper test for share flow**

Cover:

- `sdk.session.share(...)` returns a URL
- URL is copied to clipboard
- success message is shown

- [ ] **Step 4: Add a command-helper test for unshare flow**

Cover:

- `sdk.session.unshare(...)` is called
- refresh happens
- success message is shown

- [ ] **Step 5: Add a sidebar item test for shared-session context**

Cover:

- a session with `session.share?.url` gets a distinct `contextValue`
- shared sessions can show a compact shared hint in description or tooltip without overwhelming the tree

- [ ] **Step 6: Run the targeted tests to verify they fail for missing commands and context logic**

Run: `bun test src/test/commands.test.ts src/test/session-capability-commands.test.ts src/test/sidebar-provider.test.ts`
Expected: FAIL on missing command helpers, missing menu behavior, or missing shared-session tree context

### Task 2: Add tree and command-palette entry points for the session actions

**Files:**
- Modify: `package.json`
- Modify: `src/core/commands.ts`
- Modify: `src/sidebar/item.ts`

- [ ] **Step 1: Add command contributions in `package.json`**

Add these commands:

- `opencode-ui.renameSession`
- `opencode-ui.archiveSession`
- `opencode-ui.shareSession`
- `opencode-ui.unshareSession`

Add matching activation events and `view/item/context` menu entries for session items.

- [ ] **Step 2: Extend session tree context values**

In `src/sidebar/item.ts`:

- keep current default `session` context
- add a shared variant such as `session-shared`
- keep the existing session open behavior unchanged

- [ ] **Step 3: Implement rename and archive helpers in `src/core/commands.ts`**

Behavior:

- rename uses `showInputBox`
- archive uses `showWarningMessage`
- both guard on missing runtime or sdk
- both call `sessions.refresh(workspaceId, true)` after success

- [ ] **Step 4: Implement share and unshare helpers in `src/core/commands.ts`**

Behavior:

- share calls `sdk.session.share`
- copy returned `url` to `vscode.env.clipboard`
- show a concise success message
- unshare calls `sdk.session.unshare`
- refresh tree state afterward

- [ ] **Step 5: Export or structure helper logic so it is unit-testable without full command registration**

Keep the command registration function readable by extracting focused helpers rather than inlining all behavior inside `registerCommand(...)`.

- [ ] **Step 6: Run targeted tests**

Run: `bun test src/test/commands.test.ts src/test/session-capability-commands.test.ts src/test/sidebar-provider.test.ts`
Expected: PASS

### Task 3: Verify the session actions integrate cleanly with existing session flows

**Files:**
- Modify: `src/core/commands.ts`
- Modify: `src/sidebar/item.ts`
- Test: `src/test/session-capability-commands.test.ts`

- [ ] **Step 1: Confirm shared-session context does not break existing delete and tag actions**

- [ ] **Step 2: Ensure session refresh after rename or archive preserves the current workspace-scoped session list behavior**

- [ ] **Step 3: Ensure unshare is only exposed when a session is actually shared**

- [ ] **Step 4: Re-run the targeted tests**

Run: `bun test src/test/commands.test.ts src/test/session-capability-commands.test.ts src/test/sidebar-provider.test.ts`
Expected: PASS

## Chunk 2: Auth Completion

### Task 4: Add failing tests for provider-auth and MCP-auth action dispatch

**Files:**
- Modify: `src/panel/provider/actions.test.ts`
- Modify: `src/panel/provider/controller.test.ts`
- Modify: `src/panel/webview/app/model-picker.test.ts`
- Modify: `src/panel/webview/lib/session-meta.test.ts`

- [ ] **Step 1: Add a failing provider-auth action test**

Cover:

- a host action can request provider auth metadata
- OAuth-capable providers expose an actionable recovery path

- [ ] **Step 2: Add a failing MCP-auth action test**

Cover:

- MCP `needs_auth` state triggers auth-specific host behavior rather than generic reconnect-only behavior

- [ ] **Step 3: Add a model-picker test for an auth recovery affordance**

Cover:

- when no usable models are available but auth-capable providers exist, the empty state can offer a connect action instead of docs-only fallback

- [ ] **Step 4: Add a session-meta status-item test for MCP auth actions**

Cover:

- `needs_auth` maps to an explicit auth action
- auth removal can be exposed for already connected auth-backed servers if the design chooses to show it

- [ ] **Step 5: Run targeted tests to verify they fail**

Run: `bun test src/panel/provider/actions.test.ts src/panel/provider/controller.test.ts src/panel/webview/app/model-picker.test.ts src/panel/webview/lib/session-meta.test.ts`
Expected: FAIL for missing bridge messages, missing auth actions, or stale badge behavior

### Task 5: Add host-side provider-auth flow that fits the model picker

**Files:**
- Modify: `src/bridge/types.ts`
- Modify: `src/panel/provider/controller.ts`
- Modify: `src/sidebar/session-view-provider.ts`
- Modify: `src/panel/provider/actions.ts`
- Modify: `src/panel/webview/app/App.tsx`
- Modify: `src/panel/webview/app/model-picker.tsx`
- Modify: `src/core/sdk.ts`

- [ ] **Step 1: Add explicit webview message types for provider auth actions**

Prefer a dedicated host message such as:

- `providerAuthAction`

Do not overload `openDocs`.

- [ ] **Step 2: Export the official provider-auth shapes needed by the UI**

In `src/core/sdk.ts`, expose semantic aliases for:

- provider auth method metadata
- OAuth authorization response

- [ ] **Step 3: Implement a host-side provider-auth action helper in `src/panel/provider/actions.ts`**

Behavior:

- call `rt.sdk.provider.auth`
- if the selected provider supports OAuth, call `rt.sdk.provider.oauth.authorize`
- open the returned URL externally
- show callback instructions when the flow is code-based
- fall back to docs only when no auth method is available

- [ ] **Step 4: Wire the new message through both panel controllers**

Update:

- `src/panel/provider/controller.ts`
- `src/sidebar/session-view-provider.ts`

- [ ] **Step 5: Update the model-picker empty state and recovery affordance**

In `src/panel/webview/app/model-picker.tsx` and `App.tsx`:

- keep the existing docs fallback
- add a connect-auth action when provider auth metadata is actionable

- [ ] **Step 6: Run targeted tests**

Run: `bun test src/panel/provider/actions.test.ts src/panel/provider/controller.test.ts src/panel/webview/app/model-picker.test.ts`
Expected: PASS

### Task 6: Add MCP auth actions to the existing MCP badge flow

**Files:**
- Modify: `src/bridge/types.ts`
- Modify: `src/panel/provider/actions.ts`
- Modify: `src/panel/webview/lib/session-meta.ts`
- Modify: `src/panel/webview/app/App.tsx`
- Modify: `src/panel/webview/lib/session-meta.test.ts`
- Modify: `src/panel/provider/actions.test.ts`

- [ ] **Step 1: Replace the MCP-only `toggleMcp` action shape with a richer MCP action message**

Support at least:

- connect
- disconnect
- reconnect
- authenticate
- removeAuth

- [ ] **Step 2: Update `statusItemForMcp()` to emit auth-aware actions**

Examples:

- `needs_auth` -> `authenticate`
- connected auth-backed servers may optionally expose `removeAuth`

- [ ] **Step 3: Implement MCP auth helpers in `src/panel/provider/actions.ts`**

Map the actions to:

- `rt.sdk.mcp.auth.authenticate`
- `rt.sdk.mcp.auth.remove`
- existing `connect` / `disconnect`

- [ ] **Step 4: Reuse existing refresh and pending-action behavior**

Do not add a new badge component. Keep the current `StatusBadge` and `StatusPopoverAction` flow.

- [ ] **Step 5: Run targeted tests**

Run: `bun test src/panel/provider/actions.test.ts src/panel/webview/lib/session-meta.test.ts`
Expected: PASS

## Chunk 3: Workspace Status Enrichment

### Task 7: Add failing tests for formatter and workspace-status snapshot plumbing

**Files:**
- Create: `src/sidebar/focused.test.ts`
- Modify: `src/test/sidebar-task-panel.test.ts`
- Modify: `src/panel/webview/lib/session-meta.test.ts`

- [ ] **Step 1: Add a failing focused-session store test for workspace status**

Cover:

- focused-session load fetches `vcs.get`, `file.status`, and `session.diff`
- state exposes branch and workspace file-status summary alongside focused diff

- [ ] **Step 2: Add a failing formatter-status helper test**

Cover:

- formatter results collapse into a single badge tone and item list similar to MCP/LSP

- [ ] **Step 3: Add a failing sidebar diff-view test for workspace summary metadata**

Cover:

- diff companion can show branch and file-count summary without breaking the empty and ready states

- [ ] **Step 4: Run targeted tests to verify they fail**

Run: `bun test src/sidebar/focused.test.ts src/test/sidebar-task-panel.test.ts src/panel/webview/lib/session-meta.test.ts`
Expected: FAIL for missing state fields and missing formatter helper

### Task 8: Extend host-side types and stores for workspace status

**Files:**
- Modify: `src/core/sdk.ts`
- Modify: `src/sidebar/focused.ts`
- Modify: `src/sidebar/view-types.ts`
- Modify: `src/sidebar/view-provider.ts`

- [ ] **Step 1: Export semantic aliases for VCS info, formatter status, and file status**

In `src/core/sdk.ts`, add local exports backed by official SDK types for:

- `VcsInfo`
- `WorkspaceFileStatus`
- `FormatterStatus`

- [ ] **Step 2: Extend `FocusedSessionState` with compact workspace status fields**

Recommended fields:

- `branch?: string`
- `defaultBranch?: string`
- `workspaceFileStatus: WorkspaceFileStatus[]`
- `workspaceFileSummary?: { added: number; deleted: number; modified: number }`

- [ ] **Step 3: Fetch workspace status in the existing focused-session load path**

In `src/sidebar/focused.ts`, extend the `Promise.all(...)` to load:

- `rt.sdk.vcs.get({ directory: ref.dir })`
- `rt.sdk.file.status({ directory: ref.dir })`

Keep the focused session as the source of truth for `todos` and `session.diff`.

- [ ] **Step 4: Thread the new fields through `SidebarViewState` and `SidebarViewProvider`**

Do not create a second store for workspace status.

- [ ] **Step 5: Run targeted tests**

Run: `bun test src/sidebar/focused.test.ts src/test/sidebar-task-panel.test.ts`
Expected: PASS

### Task 9: Add formatter badge and workspace summary UI

**Files:**
- Modify: `src/panel/provider/snapshot.ts`
- Modify: `src/bridge/types.ts`
- Modify: `src/panel/webview/lib/session-meta.ts`
- Modify: `src/panel/webview/app/App.tsx`
- Modify: `src/sidebar/webview/index.tsx`
- Modify: `src/panel/webview/lib/session-meta.test.ts`

- [ ] **Step 1: Extend session snapshot data with formatter status**

Add `formatter` to:

- `SessionSnapshot`
- deferred update payload
- snapshot build and refresh logic

Load it alongside existing MCP, LSP, and command data.

- [ ] **Step 2: Add a formatter status reducer helper**

In `src/panel/webview/lib/session-meta.ts`:

- mirror the style of `overallMcpStatus` and `overallLspStatus`
- keep formatter items read-only in the first iteration

- [ ] **Step 3: Render formatter beside MCP and LSP in the composer status row**

In `src/panel/webview/app/App.tsx`:

- keep the existing badge layout
- add a third badge labeled `FMT` or `Formatter`
- avoid visual churn beyond the extra badge

- [ ] **Step 4: Add workspace summary to the diff companion view**

In `src/sidebar/webview/index.tsx`:

- render a compact summary above the diff list
- include branch when available
- include counts from workspace file status
- keep the current focused-session diff list intact

- [ ] **Step 5: Run targeted tests**

Run: `bun test src/panel/webview/lib/session-meta.test.ts src/sidebar/focused.test.ts src/test/sidebar-task-panel.test.ts`
Expected: PASS

## Chunk 4: Final Verification

### Task 10: Run the full verification stack

**Files:**
- Verify only

- [ ] **Step 1: Run type-check**

Run: `bun run check-types`
Expected: PASS with no TypeScript errors

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Expected: PASS with no ESLint errors

- [ ] **Step 3: Run the extension test suite**

Run: `bun run test`
Expected: PASS with all panel and extension tests green

- [ ] **Step 4: Run compile**

Run: `bun run compile`
Expected: PASS with webview and extension bundles emitted successfully

- [ ] **Step 5: Review final diff for accidental surface creep**

Run: `git diff -- package.json src/core src/sidebar src/panel src/bridge docs/superpowers`
Expected: only the approved session-actions, auth, and workspace-status files changed

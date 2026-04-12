# OpenCode UI Session Search Design

## Goal

Deliver the first post-M1 session search experience inside the Sessions tree view so users can quickly narrow sessions for one workspace without leaving the sidebar or changing the existing session panel flow.

## Scope

This slice includes:

1. Workspace-scoped session search from the Sessions tree view
2. Search result rendering inside the selected workspace node
3. Clear search and empty or error states
4. Capability-aware fallback when the runtime does not support session search

This slice does not include:

- Cross-workspace session search
- Search UI inside the session panel webview
- Persistent saved searches
- Real-time incremental updates for active search results
- Search across child sessions or archived sessions beyond what the server returns for `session.list`

## Product Decisions

### 1. Search stays scoped to one workspace

The first session search release should only filter sessions for the workspace the user explicitly targets.

Behavior:

- Search starts from a workspace node action, not from a global command
- Only the targeted workspace enters search mode
- Other workspace nodes keep showing their normal session lists
- Search results stay grouped under the same workspace node

This keeps the mental model simple and avoids introducing a second cross-workspace browsing mode before the tree view needs it.

### 2. Search uses an explicit workspace action

Each workspace node should expose a `Search Sessions...` action in both the inline actions and the workspace context menu.

Behavior:

- Triggering the action opens a VS Code input box
- Empty input or cancellation does not change the current tree state
- A non-empty query switches that workspace into search mode
- Search mode shows a `Clear Search` item before the results

This makes the scope obvious, avoids noisy permanent pseudo-items in the tree, and fits the existing workspace-item action model.

### 3. Search results replace only the workspace child list

The sidebar should not merge search results into the normal cached session list.

Behavior:

- Normal mode continues to render `sessions.list(workspaceId)`
- Search mode renders one of:
  - `Searching sessions...`
  - `Clear Search` plus matching results
  - `Clear Search` plus `No matching sessions`
  - `Clear Search` plus an error status item
- Matching sessions still use the existing `SessionItem` shape and open behavior

This avoids contaminating steady-state session cache and keeps search as an on-demand view concern.

### 4. Capability support is advisory, not blocking

Session search should respect the runtime capability layer introduced in M1.

Behavior:

- If `sessionSearch` is `unsupported`, the command shows a clear message and does not enter search mode
- If `sessionSearch` is `unknown`, the command may still attempt search
- Successful search should allow the capability cache to converge toward supported behavior
- Search failures that look like unsupported server behavior should mark the capability unsupported
- Ambiguous failures should surface an error but not break the workspace list

This keeps the feature safe across mixed OpenCode server versions without turning unsupported search into a fatal extension failure.

## Architecture

This feature should stay within the current extension boundaries:

- `src/core/commands.ts` owns the search and clear-search commands plus input-box flow
- `src/core/capabilities.ts` continues to own support checks and cache updates
- `src/sidebar/provider.ts` owns workspace-scoped search state and tree rendering
- `src/sidebar/item.ts` owns any new tree items needed for clear-search or search result status

The preferred flow is:

1. User triggers `Search Sessions...` from a workspace node
2. Command verifies runtime readiness and capability state
3. Command collects a query through `showInputBox`
4. Sidebar provider enters a searching state for that workspace
5. Provider calls `sdk.session.list({ directory: rt.dir, roots: true, search })`
6. Provider stores the results in workspace-local search state and refreshes the tree
7. User clears search to return to the normal cached root session list

## File-Level Design

### Core

- Extend command registration with:
  - `opencode-ui.searchWorkspaceSessions`
  - `opencode-ui.clearWorkspaceSessionSearch`
- Reuse the existing capability store instead of adding a new search-specific manager
- Keep `SessionStore` unchanged so normal session refresh and event handling stay authoritative for the default tree

### Sidebar

- Add lightweight workspace-scoped search state to `SidebarProvider`
- Search state should track:
  - active query
  - loading status
  - matched sessions
  - last error message
- Render search-mode children only for the targeted workspace
- Add a dedicated tree item for `Clear Search`

### Data Rules

- Search is on-demand and not persisted across reloads
- Search mode does not need to subscribe to incremental session event updates
- `Refresh Workspace Sessions` refreshes the normal root-session cache only
- If a workspace is already in search mode after refresh, keep the current query and rendered search results until the user clears or reruns search

## Success Criteria

This slice is successful when:

- A user can trigger `Search Sessions...` from a workspace node and see only that workspace filtered
- Search results open sessions exactly like normal session items
- Search mode has clear loading, empty, and error feedback
- Unsupported OpenCode runtimes fail gracefully with a user-facing message
- Existing session refresh, session open, and panel flows continue to work unchanged outside search mode

## Non-Goals

- A global session search surface
- Search chips, fuzzy scopes, or saved filters
- Search embedded inside status bar or panel UI
- Auto-refreshing active search results from runtime events

## Risks And Mitigations

### Risk: Search mode drifts from normal session state

Mitigation:

- Keep search results separate from `SessionStore` and treat them as temporary tree rendering state only

### Risk: Capability classification becomes stale after one failed search

Mitigation:

- Only mark unsupported when the error clearly matches unsupported behavior; otherwise keep capability as unknown

### Risk: Tree view becomes noisy

Mitigation:

- Use an explicit workspace action instead of a permanent search row, and show `Clear Search` only while search mode is active

### Risk: Search expectations grow into cross-workspace browsing too early

Mitigation:

- Keep the first version explicitly workspace-scoped and treat global search as a separate future milestone

## Testing Strategy

- Add command or provider tests for:
  - supported runtime search success
  - unsupported capability short-circuit
  - empty query or cancelled input
  - runtime error while searching
  - clearing search
- Add tree rendering tests for:
  - default session list
  - loading state
  - empty result state
  - populated result state
  - error state
- Add capability interaction coverage to ensure unsupported errors do not leave the tree stuck in search mode

## Approved Implementation Slice

The approved implementation slice is:

- Workspace-node `Search Sessions...` action
- Workspace-local search mode in the Sessions tree
- `Clear Search`, loading, empty, and error states
- Capability-aware unsupported fallback

This slice should land before any broader M2 work such as global search, tags, or task inbox.

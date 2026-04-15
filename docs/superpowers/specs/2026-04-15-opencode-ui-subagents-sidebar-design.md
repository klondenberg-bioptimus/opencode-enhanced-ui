# OpenCode UI Focused Session Subagents Sidebar Design

## Goal

Add a new `Subagents` companion sidebar view that follows the currently selected OpenCode session, shows that session's child-session activity in real time, preserves finished subagents in history, and lets users open any subagent session directly from the sidebar.

## Scope

This slice includes:

1. A new focused-session-scoped `Subagents` sidebar view
2. Real-time subagent state derived from child sessions and session status events
3. Grouped `In Progress` and `Done` presentation for all visible descendant subagent sessions
4. Direct navigation from a subagent row to that subagent session tab

This slice does not include:

- Changes to the main `Sessions` tree hierarchy
- A workspace-wide subagent inbox or activity feed
- Search, filtering, pinning, or collapsing inside the new subagents view
- Editing or interrupting subagents from the sidebar
- New server-side metadata for "completed" beyond existing session status

## Product Decisions

### 1. Subagents stays focused-session scoped

The new view should match the mental model of the existing `TODO` and `MODIFIED FILES` companion views.

Behavior:

- The view follows the currently active or selected session
- The view does not aggregate across all sessions in a workspace
- The view refreshes when focus changes to a different root or child session

This keeps the feature aligned with "what is happening under the session I am looking at right now" instead of turning it into a second global browser.

### 2. The main `Sessions` tree should remain root-session-first

Subagents are technically child sessions, but the primary sessions tree should keep its current root-only organization for this slice.

Behavior:

- `src/core/session-list.ts` continues to track root sessions only
- The main sidebar tree remains optimized for browsing and organizing top-level sessions
- The new subagent experience lives in a companion view, not inside the main tree

This avoids broad tree behavior changes and keeps the implementation isolated to the focused-session path.

### 3. State groups are operational, not semantic lifecycle labels

The sidebar groups should reflect live session execution state using existing session status values instead of inventing a new persistent completion model.

Behavior:

- `In Progress` includes child sessions with `busy` or `retry`
- `Done` includes child sessions with `idle`
- A subagent can move between groups if its status changes again later
- Archived or deleted child sessions disappear from the current view

This matches the current SDK model and avoids encoding assumptions the server does not expose.

### 4. The view should show all descendant subagents

The sidebar should present the entire visible descendant subtree for the focused session, not only direct children and not only recent items.

Behavior:

- Root sessions show all descendant child sessions
- Child sessions show their own descendant subtree only
- The list is not truncated to a recent count
- The root session itself is never listed in the subagents view

This gives users a complete real-time monitor for the focused session's delegated work.

### 5. Clicking a subagent opens that session

The subagents view should act as a lightweight navigation surface.

Behavior:

- Clicking a row opens the matching subagent session
- The action reuses the existing `openSessionById` flow
- The view does not keep users anchored to the root session after click

This matches the user's expectation that the sidebar should be both a monitor and a jump list.

## Architecture

This slice should reuse the existing focused-session companion-view architecture:

- `src/sidebar/focused.ts` remains the source of focused-session-derived sidebar data
- `src/sidebar/view-provider.ts` and `src/sidebar/view-types.ts` carry the new sidebar mode and payload
- `src/sidebar/webview/index.tsx` owns the grouped subagent list rendering and click behavior
- `src/core/events.ts` remains the single source of live runtime events
- Existing panel open commands continue to own session-tab navigation

The preferred flow is:

1. The active or selected session changes
2. `FocusedSessionStore` resolves the focused session and loads its descendant child sessions
3. The store combines child session metadata with runtime status data
4. The `Subagents` sidebar receives a focused-session-scoped payload
5. Live `session.created`, `session.updated`, `session.deleted`, and `session.status` events incrementally update that payload
6. Clicking a row opens the matching subagent session

## Data Model

The focused-session state should grow a dedicated subagent payload instead of forcing the existing todo and diff types to carry extra session information.

Recommended shape:

- `subagents: FocusedSubagentItem[]`
- `FocusedSubagentItem` includes:
  - `session: SessionInfo`
  - `status: SessionStatus`

Derived UI state should stay in the webview layer:

- `inProgress = busy + retry`
- `done = idle`
- display title uses `displaySessionTitle`
- relative ordering uses `session.time.updated`

This keeps host-side state authoritative and webview-side grouping lightweight.

## Runtime And Event Design

### Initial load

When the focused session changes, the focused-session store should load:

1. `session.get(sessionID)` for the focused session metadata
2. The descendant subtree for that focused session using `session.children()` recursively
3. `session.status()` once for the current workspace

The resulting child sessions should be filtered to:

- exclude the focused session itself
- exclude archived sessions
- include every visible descendant child session

### Incremental updates

The store should update subagent state from the existing event stream without forcing full reloads in normal cases.

Relevant events:

- `session.created`
  - add the child session if it belongs inside the current focused subtree
- `session.updated`
  - update stored session metadata
  - remove the item if it leaves the subtree or becomes archived
- `session.deleted`
  - remove the matching child session
- `session.status`
  - update the stored execution state for matching child sessions
- `server.instance.disposed`
  - trigger a reload of the current focused state

Fallback rule:

- If subtree membership cannot be derived safely from current state, reload the focused subagent payload for the current session

This keeps common subagent activity incremental while preserving correctness for topology changes.

## UI Design

### View identity

- Add a new companion sidebar view named `Subagents`
- Keep it visually aligned with the existing focused-session companion views

### Empty states

- No focused session:
  - `Select or focus an OpenCode session to view subagents`
- Focused session has no descendant child sessions:
  - `No subagents yet`

### Grouping

Render two flat sections:

- `In Progress (n)`
- `Done (n)`

Grouping rules:

- `busy` and `retry` belong to `In Progress`
- `idle` belongs to `Done`

### Ordering

Within each section:

- sort by `session.time.updated` descending

This keeps the most recently active work at the top of both groups.

### Row content

Each row should show:

- display title
- compact secondary status text:
  - `running`
  - `retrying`
  - `done`
- lightweight disambiguation:
  - short session id or relative time

Icons should follow current session semantics:

- spinner or busy icon for `busy`
- retry or warning icon for `retry`
- normal session icon for `idle`

### Interaction

- Clicking a row opens the selected subagent session
- Rows do not expose inline actions in this slice
- The view does not support collapsing nested descendants separately; it is a grouped list, not a tree

## File-Level Design

### `src/sidebar/focused.ts`

- Extend `FocusedSessionState` with `subagents`
- Add a focused-session loader that builds the descendant child-session list and status map
- Update event handlers to keep `subagents` in sync incrementally
- Preserve the current todo and diff behavior unchanged

### `src/sidebar/view-types.ts`

- Extend `SidebarViewMode` with `subagents`
- Extend `SidebarViewState` with the subagent payload needed by the webview

### `src/sidebar/view-provider.ts`

- Allow the provider to emit state for `subagents`
- Reuse the existing `openSession` webview message path for row clicks

### `src/sidebar/webview/index.tsx`

- Add `SubagentsList`
- Add grouped rendering helpers for in-progress and done items
- Reuse the current empty-state shell and compact companion-view styling where possible

### Extension registration and contribution points

- Add a new view contribution alongside the existing focused-session companion views
- Wire the new view to `SidebarViewProvider` using the new `subagents` mode

## Testing Strategy

Add focused-session store tests for:

- initial subtree load for a root session
- initial subtree load for a child session
- grouping rules for `busy`, `retry`, and `idle`
- removal of archived and deleted child sessions
- incremental add or update of child sessions from live events

Add sidebar webview tests for:

- empty-state rendering
- grouped subagent section rendering
- ordering by update time
- click-to-open message dispatch

Add integration-level view-provider coverage for:

- mode payload shape for `subagents`
- compatibility with existing todo and diff modes

## Risks And Mitigations

### Risk: Focused-session loading becomes heavier than todo or diff

Mitigation:

- Limit the fetch scope to the current focused session subtree only
- Use incremental event updates after initial load instead of full reloads on every event

### Risk: Subtree membership changes are hard to reconcile from partial local state

Mitigation:

- Keep incremental updates for common create, status, and delete flows
- Fall back to reloading the current focused subtree when membership is ambiguous

### Risk: The new view duplicates too much panel-session logic

Mitigation:

- Reuse the same subtree semantics as panel snapshot loading
- Keep the sidebar payload narrower than the panel snapshot and avoid moving panel code wholesale

### Risk: Very large descendant trees produce a long `Done` section

Mitigation:

- Accept the full-history list as a deliberate product decision for this slice
- Keep rows compact and ordered by recent update time

## Success Criteria

This slice is successful when:

- users can see live subagent activity for the currently focused session in a dedicated companion sidebar
- active and finished subagents are clearly separated into `In Progress` and `Done`
- the list includes all visible descendant child sessions, not just direct children or recent items
- clicking a subagent opens that specific session
- the main `Sessions` tree and existing todo or diff companion views continue to behave as they do today

## Approved Implementation Slice

The approved implementation slice is:

- new focused-session `Subagents` companion view
- descendant child-session loading in the focused-session store
- real-time subagent status grouping into `In Progress` and `Done`
- direct open-session navigation from subagent rows

This slice should be implemented without changing the main root-session sidebar tree structure.

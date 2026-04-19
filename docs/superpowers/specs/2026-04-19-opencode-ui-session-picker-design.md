# OpenCode UI Session Picker Design

## Goal

Add a panel-native session picker that opens from the composer `/sessions` slash action, lets users switch sessions in place, and exposes the core session-management actions that currently live in the sessions sidebar.

## Scope

This slice includes:

1. A new local `/sessions` composer action
2. A webview-native session picker dialog inside the session panel
3. Two picker scopes:
   - `Related`
   - `Workspace`
4. Session list grouping by day, ordered newest first
5. Text search over title, short session id, and tags
6. Single-tag filtering
7. Inline actions for:
   - rename
   - share
   - unshare
   - archive
   - edit tags
8. In-place session switching that closes the current session panel state and retargets the panel to the chosen session

This slice does not include:

- Cross-workspace session browsing
- Archived session visibility toggles
- Multi-tag filtering
- Sidebar and picker filter state synchronization
- Rebuilding the sidebar sessions tree inside the panel

## Product Decisions

### 1. `/sessions` should behave like a local panel command, not a server slash command

The picker is a panel UI affordance. It should open immediately from the composer without sending a slash command to the OpenCode server.

Behavior:

- Typing `/sessions` and submitting opens the picker
- No message is sent to the current session
- The composer draft clears the same way local picker actions such as `/theme` do

This keeps the interaction fast and consistent with the existing local panel commands.

### 2. The picker should live inside the panel webview

The user explicitly wants a custom session panel picker instead of VS Code `QuickPick`. The existing panel already has dialog-like pickers for themes and models, so the new picker should follow that pattern.

Behavior:

- The picker appears as an in-panel dialog
- Keyboard navigation follows the same conventions as existing pickers
- `Enter` confirms the current highlighted session
- `Escape` closes the picker without side effects

This preserves visual and interaction consistency inside the panel.

### 3. Default scope is `Related`, with `Workspace` available as a secondary view

The first screen should prioritize the current session tree because it is usually the most relevant context. Users can then widen the search to the whole workspace when needed.

Behavior:

- `Related` shows sessions from the current snapshot `relatedSessionIds`
- `Workspace` shows all non-archived sessions in the current workspace
- The current open session is excluded from both lists
- Empty `Related` state offers a clear path to switch to `Workspace`

This keeps the first view focused while still supporting broad discovery.

### 4. Picker filters should be local to the panel

The picker should mirror sidebar capabilities without sharing state with sidebar search or tag filters.

Behavior:

- Search input filters only the picker list
- Tag filtering applies only inside the picker
- Closing the picker resets transient picker UI state unless a future iteration intentionally persists it

This avoids surprising coupling between the sidebar and panel.

### 5. Session management actions should appear inline on the active row

The user chose inline actions over secondary action bars or keyboard-only affordances.

Behavior:

- The highlighted or hovered row exposes inline action icons
- Available actions depend on session state
- Shared sessions show `unshare` instead of `share`
- The current session does not appear in the list, so no inline actions are needed for the currently open session

This matches the sidebar interaction style while staying compact.

## Architecture

The new picker should reuse the existing host and panel patterns instead of introducing a separate transport subsystem.

Preferred flow:

1. `resolveComposerSlashAction()` recognizes `/sessions` as a local composer action
2. `App.tsx` opens a local `SessionPicker` dialog instead of posting a slash command
3. The panel controller responds to picker messages to:
   - load session-picker data
   - switch sessions
   - run inline actions
4. The host reuses existing session, share, archive, and tag helpers where possible
5. The host posts refreshed picker payloads back into the current panel after any inline action completes
6. Confirmed session changes continue to use `panels.retarget(currentRef, nextRef)`

This keeps the implementation aligned with the current panel lifecycle and minimizes impact on unrelated code.

## Data Design

### Picker payload

The panel webview needs a dedicated snapshot-like payload for picker rendering. It should include:

- current session id
- current workspace id and directory
- scope options and active scope
- sessions for the current workspace
- `relatedSessionIds` from the current panel snapshot
- local tag data for each session

Each session entry should contain only the fields the picker needs:

- session id
- title
- updated time
- share presence
- tags
- whether it belongs to `related`

This keeps picker state focused and avoids duplicating the full session snapshot structure.

### Grouping and sorting

Sessions should be sorted descending by `time.updated` and then grouped by local day.

Initial label strategy:

- `Today`
- `Yesterday`
- absolute date for older sessions

This supports fast scanning without overcomplicating the first version.

### Filtering

Filtering happens in the webview from the latest host payload.

Search matches:

- normalized display title
- short session id
- full session id
- tags

Tag filtering is single-select in the first version. The picker will expose the distinct tags available in the current scope and let the user pick one or clear the filter.

## Host Design

### Reused data sources

The picker should reuse current sources rather than inventing new stores:

- session list from `SessionStore`
- tag data from `SessionTagStore`
- related session ids from the current panel snapshot

### Reused action helpers

The picker should reuse or slightly generalize existing command helpers:

- `renameSession`
- `archiveSession`
- `shareSession`
- `unshareSession`

Tag editing should move behind a small helper so the sidebar command and the picker action share the same behavior.

### Refresh behavior

After any picker action:

- refresh workspace sessions when the underlying session record changes
- rebuild picker payload
- push the refreshed picker payload back to the panel

Specific expectations:

- archived sessions disappear from the picker immediately
- share and unshare actions update inline actions immediately
- renamed sessions update the display title immediately
- tag edits update search and tag filter options immediately

## Webview Design

### UI structure

The `SessionPicker` should reuse the visual vocabulary of `ModelPicker` and `ThemePicker`, but adapt it for session management.

Main regions:

1. Header
   - title
   - workspace name
   - active scope toggle
2. Toolbar
   - search input
   - tag filter control
3. Grouped list
   - day sections
   - session rows with metadata and inline actions
4. Empty state
   - no related sessions
   - no matching search results

### Row layout

Each row should show:

- title
- short id
- updated time hint
- tags summary when present
- shared indicator when present
- inline actions on active or hovered row

The selected row should remain easy to distinguish during keyboard navigation.

### Keyboard behavior

The picker should follow existing picker conventions:

- `ArrowUp` and `ArrowDown` move selection
- `Ctrl+P` and `Ctrl+N` move selection
- `PageUp`, `PageDown`, `Home`, and `End` work within the filtered list
- `Enter` switches session
- `Escape` closes the picker
- Inline actions should remain clickable without breaking row selection behavior

### Tag editing

The first version should keep tag editing intentionally simple:

- activating the tag action opens a lightweight input flow on the host side
- input format remains `tag-a, tag-b`

This preserves current tag semantics and keeps the picker scope manageable.

## File-Level Design

### `src/panel/webview/app/composer-actions.ts`

- Add a new local slash action type for `/sessions`
- Resolve `/sessions` only when no extra arguments are present

### `src/panel/webview/app/composer-actions.test.ts`

- Add tests describing `/sessions` as a local action

### `src/panel/webview/app/App.tsx`

- Add local picker open and close state for `SessionPicker`
- Open the picker when `/sessions` is submitted
- Render the picker dialog
- Wire picker messages for switching and inline actions

### `src/panel/webview/app/state.ts`

- Extend panel state with the picker payload and transient picker UI state if needed
- Normalize incoming picker data from host messages

### `src/panel/webview/app/session-picker.tsx`

- New focused component for:
  - scope toggle
  - search
  - tag filter
  - grouped rows
  - inline actions

### `src/panel/webview/app/session-picker.test.tsx`

- Add unit tests for grouping, filtering, and action visibility

### `src/bridge/types.ts`

- Add host and webview message contracts for session picker open, data refresh, switching, and inline actions

### `src/panel/provider/controller.ts`

- Handle picker-specific webview messages
- Load picker payload from current workspace state
- Re-post updated picker payload after actions

### `src/panel/provider/actions.ts`

- Add helper functions for picker data building and action execution where host-side logic belongs outside the controller

### `src/core/commands.ts`

- Extract tag-editing behavior into a helper that both sidebar commands and panel picker actions can call
- Reuse existing action helpers instead of duplicating business logic

### `src/test/commands.test.ts`

- Add or extend tests around the new shared tag helper if extraction lands here

### `src/panel/provider/actions.test.ts`

- Add host action tests for picker refresh and switching behavior

## Testing Strategy

The implementation should follow TDD and progress from pure data behavior to host integration.

### 1. Picker data and filtering tests

Cover:

- excluding the current session
- `Related` scope filtering
- `Workspace` scope filtering
- day grouping and newest-first order
- search matching title, ids, and tags
- single-tag filtering
- row action visibility by shared state

### 2. Composer slash action tests

Cover:

- `/sessions` resolves to a local picker action
- `/sessions` does not route through slash-command host submission

### 3. Host action tests

Cover:

- loading picker payload
- in-place retarget on confirm
- refreshing picker data after rename
- refreshing picker data after share and unshare
- refreshing picker data after archive
- refreshing picker data after tag edit

### 4. Component interaction tests

Cover:

- scope switching
- search changing grouped results
- tag filtering
- inline actions rendering for the selected row
- empty states

## Risks And Mitigations

### 1. Host and picker state can drift after inline actions

Mitigation:

- treat the host as the source of truth
- always rebuild and resend picker payload after a modifying action

### 2. Too much sidebar behavior copied into the panel

Mitigation:

- reuse data stores and action helpers
- keep sidebar tree rendering separate
- only mirror user-facing capabilities, not UI architecture

### 3. Large `App.tsx` growth

Mitigation:

- move picker rendering and list logic into a dedicated `session-picker.tsx`
- keep `App.tsx` responsible only for opening, closing, and wiring actions

### 4. Accidental regression to normal composer submission flow

Mitigation:

- pin `/sessions` behavior with composer-action and composer-submit tests before implementation

## Success Criteria

This feature is complete when:

1. `/sessions` opens a panel-native picker instead of sending a message
2. Users can switch sessions in place from the picker
3. The picker defaults to `Related` and can switch to `Workspace`
4. Sessions are grouped by day and searchable by title, id, and tags
5. A single tag filter is available
6. Inline session actions match the core sidebar capabilities
7. The feature is covered by targeted tests and existing panel behavior remains green

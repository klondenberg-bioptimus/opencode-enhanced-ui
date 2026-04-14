# OpenCode UI Panel And Tree Capability Alignment Design

## Goal

Define a focused capability-alignment slice for OpenCode UI that adds the most useful official SDK features which naturally fit the existing VS Code session panel and sidebar tree, without turning the extension into a full OpenCode console.

## Scope

This slice includes:

1. Session management actions that fit the existing session tree and session tabs
2. Authentication flows that fit the existing model and MCP status surfaces
3. Workspace status signals that fit the existing sidebar and panel status areas
4. A phased rollout order that keeps the UI structure intact

This slice does not include:

- Recreating the full OpenCode TUI inside VS Code
- New standalone management pages for providers, MCP, worktrees, or PTY sessions
- Terminal-style PTY management
- Worktree lifecycle management
- Global instance administration or upgrade controls
- Low-level transcript mutation tools that do not map cleanly to the current UI

## Product Decisions

### 1. New SDK-backed features must attach to existing surfaces

The extension should only adopt SDK capabilities that can be expressed through the current product shape:

- `SESSIONS` tree and its context menus
- Session tabs and panel host actions
- The bottom composer identity and status area
- The existing `TODO` and `MODIFIED FILES` companion sections

If a capability requires a new top-level view, console surface, or multi-step flow that has no natural entry point today, it should stay out of scope for this slice.

### 2. Session management comes before broader workspace tooling

The highest-value extension workflows today revolve around browsing, opening, and continuing sessions. The first capabilities to add should therefore improve session organization and sharing:

- rename session
- archive or hide session
- share session
- unshare session

These actions directly strengthen the existing tree and tab workflows without changing the mental model.

### 3. Authentication should close existing dead ends

The extension already exposes provider selection and MCP status, but some failure states still force users to leave the plugin or fall back to CLI behavior.

The next most valuable capability group is:

- provider auth introspection and OAuth initiation
- MCP auth initiation and removal

These should be attached to the places where users already notice the problem:

- model selection and send failure flows for providers
- the `MCP` status badge and MCP status items for MCP servers

### 4. Workspace status should enrich existing signals, not replace them

The extension already gives users focused-session todos, modified files, MCP state, and LSP state. Additional status capabilities should extend these surfaces instead of creating parallel inspectors.

The best-fit additions are:

- VCS branch and workspace diff signals
- file status signals
- formatter status

These are useful because they complement the code-assistant workflow users already have open in VS Code.

## Recommended Capability Set

### Phase 1: Session Actions

Use these official SDK methods:

- `session.update`
- `session.share`
- `session.unshare`

Product fit:

- Add rename and archive actions to session tree context menus
- Add share and unshare actions to session tab or panel actions
- Keep the current session list as the primary navigation surface

Why this phase first:

- highest day-to-day value
- lowest implementation risk
- no new visual paradigm required

### Phase 2: Auth Completion

Use these official SDK methods:

- `provider.auth`
- `provider.oauth.authorize`
- `provider.oauth.callback`
- `mcp.auth.start`
- `mcp.auth.authenticate`
- `mcp.auth.callback`
- `mcp.auth.remove`

Product fit:

- Provider auth belongs near the current model and provider selection UI
- MCP auth belongs in the existing `MCP` badge and MCP action flows
- Error states should offer recovery actions instead of only showing failure text

Why this phase second:

- the UI already exposes these concepts
- users hit these failures during normal use
- solving auth gaps increases the practical value of the rest of the plugin

### Phase 3: Workspace Status Enrichment

Use these official SDK methods:

- `vcs.get`
- `vcs.diff`
- `file.status`
- `formatter.status`

Product fit:

- Show current branch and working-tree status on the workspace node or companion areas
- Enrich `MODIFIED FILES` with better workspace-backed status information
- Add formatter state beside the existing `MCP` and `LSP` badges

Why this phase third:

- useful and visible, but not as blocking as session management or auth
- should be added only after the session and auth flows are tightened up

## Deferred Capability Set

The following official SDK capabilities are intentionally deferred because they do not fit the current panel and tree model well enough:

- `pty.*`
- `worktree.*`
- `tui.*`
- `global.*`
- `instance.dispose`
- `auth.set`
- `auth.remove`
- `tool.*`
- `experimental.workspace.*`
- `experimental.console.*`
- `session.prompt`
- `part.update`
- `part.delete`

These may become relevant later, but they would either:

- require a new control surface
- duplicate workflows VS Code already owns
- introduce maintenance cost without clear user-facing payoff

## Architecture

This slice should keep the current extension boundaries:

- `src/core/commands.ts` owns new tree and command entry points
- `src/sidebar/item.ts` and `src/sidebar/provider.ts` own additional tree descriptions and context values
- `src/panel/provider/` owns session action dispatch and panel-host side effects
- `src/panel/webview/app/App.tsx` owns new status badges and composer-area recovery actions
- `src/core/sdk.ts` remains only an SDK adapter, not a product-policy layer

The preferred flow is:

1. User discovers an action from an existing tree item, panel action, or status badge
2. The extension invokes the matching official SDK method for the active workspace runtime
3. Existing refresh and snapshot flows reconcile the new server state back into the tree or panel
4. The UI keeps using the current session-centric and workspace-centric views instead of branching into a new management experience

## File-Level Design

### Session Actions

- Extend tree context values or commands to support rename and archive operations
- Add panel or tab actions for share and unshare
- Reuse existing refresh behavior so session updates propagate through normal list rebuilds

### Provider Auth

- Extend the model picker or adjacent panel controls with recovery affordances when auth is missing
- Convert known provider-auth failure states into actionable UI prompts
- Keep OAuth transport host-side so the webview remains a thin initiator

### MCP Auth

- Expand the existing `MCP` badge action model to include auth-required states
- Reuse current MCP refresh paths after auth completes or credentials are removed
- Avoid building a separate MCP settings page in this slice

### Workspace Status

- Enrich workspace node descriptions with branch or status details where concise
- Strengthen `MODIFIED FILES` with real workspace status when it improves user understanding
- Add formatter status as a small extension of the current bottom status badge row

## Success Criteria

This slice is successful when:

- users can rename and archive sessions from the current tree and tab workflows
- users can share and unshare sessions without leaving the plugin
- provider and MCP auth failures have an in-plugin recovery path
- the sidebar and panel communicate repository and formatter status more clearly
- the extension still feels like a session browser and session workspace, not a generalized OpenCode admin console

## Non-Goals

- full provider management
- standalone MCP management
- PTY terminal orchestration
- worktree creation and reset workflows
- transcript-part editing and deletion
- cross-project admin features

## Risks And Mitigations

### Risk: The plugin grows sideways into too many management actions

Mitigation:

- restrict new capabilities to existing entry points and reject features that need brand-new top-level views

### Risk: Authentication flows become awkward inside a webview-driven panel

Mitigation:

- keep auth initiation and callback handling in host-side commands and use the webview only as an action trigger

### Risk: Workspace status becomes noisy

Mitigation:

- keep branch, diff, and formatter signals compact and additive, following the existing `MCP` and `LSP` badge style

### Risk: Session organization changes accidentally disrupt tree behavior

Mitigation:

- build rename and archive as extensions of the current session list and refresh model instead of inventing a second storage layer

## Testing Strategy

- Add command tests for rename, archive, share, and unshare entry points
- Add provider and MCP auth action tests around host-side dispatch and recovery behavior
- Add sidebar tests for enriched workspace and session descriptions when VCS or archive state is present
- Add panel webview tests for new bottom status badges or action triggers
- Keep integration verification aligned with the current local extension validation commands

## Approved Implementation Order

The approved implementation order is:

1. Session actions:
   - rename
   - archive or hide
   - share
   - unshare
2. Auth completion:
   - provider auth and OAuth
   - MCP auth actions
3. Workspace status enrichment:
   - VCS branch and diff signals
   - file status
   - formatter status

This order keeps the work aligned with the current UI, prioritizes user-visible utility, and avoids prematurely broadening the plugin's scope.

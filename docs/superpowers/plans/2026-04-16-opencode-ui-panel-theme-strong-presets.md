# OpenCode UI Strong Panel Presets Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `claude` and `codex` panel presets into clearly differentiated light and dark visual systems while keeping the `default` preset unchanged.

**Architecture:** Keep the existing `panelTheme` setting and `data-oc-theme` root hook, then layer stronger preset styling through panel CSS only. `theme.css` will carry preset-specific light and dark tokens, while `layout.css`, `timeline.css`, `dock.css`, `tool.css`, and `status.css` will add narrowly scoped `[data-oc-theme]` overrides for transcript rhythm, message treatment, tool cards, and composer chrome.

**Tech Stack:** TypeScript tests, Bun, React TSX webviews, CSS.

---

## Chunk 1: Lock The Expected Theme Surface

### Task 1: Update panel-theme tests to describe the stronger preset contract

**Files:**
- Modify: `src/test/panel-theme.test.ts`

- [ ] **Step 1: Refresh stale footer and composer layout assertions**

Update the existing assertions so they match the current baseline structure instead of the older compact-footer expectations.

- [ ] **Step 2: Add failing assertions for preserved default styling**

Assert that both light and dark `default` branches retain the hard-edged `0px` radii and original base canvas treatment.

- [ ] **Step 3: Add failing assertions for strong preset differentiation**

Assert that:

- `claude` and `codex` define distinct light and dark canvas tokens
- `layout.css` contains preset-specific transcript shell rules
- `timeline.css` contains preset-specific message treatments
- `status.css` contains preset-specific composer treatments

- [ ] **Step 4: Run the targeted test file and verify failure**

Run: `bun test src/test/panel-theme.test.ts`

Expected: FAIL because the stronger preset CSS branches are not implemented yet.

## Chunk 2: Implement Preset Tokens And Layout Rhythm

### Task 2: Expand panel token support without changing `default`

**Files:**
- Modify: `src/panel/webview/theme.css`
- Modify: `src/panel/webview/layout.css`

- [ ] **Step 1: Add preset-only shell variables**

Introduce variables for shell background, transcript padding, transcript width, footer surface, and shell dividers. Keep default fallbacks equal to current behavior.

- [ ] **Step 2: Define `claude` light and dark shell tokens**

Use warm paper and warm charcoal surfaces, softer borders, broader radii, and more editorial spacing.

- [ ] **Step 3: Define `codex` light and dark shell tokens**

Use cooler gray and blue-gray surfaces, clearer section framing, firmer borders, and workbench-like spacing.

- [ ] **Step 4: Apply shell variables in layout rules**

Keep `default` visually unchanged while allowing `claude` and `codex` to alter transcript width, gutter, background treatment, and footer framing.

## Chunk 3: Re-skin Transcript, Tooling, And Composer

### Task 3: Rework transcript and tool surfaces per preset

**Files:**
- Modify: `src/panel/webview/timeline.css`
- Modify: `src/panel/webview/tool.css`
- Modify: `src/panel/webview/dock.css`

- [ ] **Step 1: Add `claude` transcript overrides**

Make the transcript feel editorial and conversational with softer tool cards, gentler flow markers, and less mechanical message framing.

- [ ] **Step 2: Add `codex` transcript overrides**

Make the transcript feel like a workbench with cleaner user bubbles, sharper section blocks, and clearer utility framing.

- [ ] **Step 3: Tune tool and dock blocks**

Give `claude` tool cards the warm terminal-card feel from the references and make `codex` tool rows feel flatter and more utilitarian.

### Task 4: Rework the composer and status chrome per preset

**Files:**
- Modify: `src/panel/webview/status.css`

- [ ] **Step 1: Add `claude` composer overrides**

Create a docked tray feel with softer surfaces, larger radii, warmer accents, and badge styling that feels embedded in a conversation surface.

- [ ] **Step 2: Add `codex` composer overrides**

Create a cold console-panel feel with clearer control segmentation, blue-led emphasis, and flatter but deliberate framing.

- [ ] **Step 3: Keep the existing interaction model unchanged**

Do not change composer behavior, only its visual presentation.

## Chunk 4: Verify The Contract

### Task 5: Re-run targeted validation

**Files:**
- Modify: `src/test/panel-theme.test.ts`

- [ ] **Step 1: Run the targeted theme tests**

Run: `bun test src/test/panel-theme.test.ts`

Expected: PASS.

- [ ] **Step 2: Run the broader panel validation**

Run: `bun run check-types && bun run test`

Expected: PASS.

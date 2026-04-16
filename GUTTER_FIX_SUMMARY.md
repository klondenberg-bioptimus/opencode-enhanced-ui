# Theme Gutter Fix Summary

## Problem
Codex and Claude themes had visible gaps on the left and right sides of the panel, creating a "container-like" appearance instead of a seamless full-width background.

## Root Cause
The `--oc-shell-gutter` CSS variable was set to:
- **Codex theme**: 18px (both dark and light)
- **Claude theme**: 20px (both dark and light)

This gutter value was applied as horizontal padding to `.oc-transcriptInner` and `.oc-footerInner`, creating gaps between the background gradient and the viewport edges.

## Solution
Changed `--oc-shell-gutter` from 18px/20px to **0px** for all theme variants:

### Modified Files
- `src/panel/webview/theme.css`

### Changes Made
```css
/* Before */
body.vscode-dark .oc-shell[data-oc-theme="codex"] {
  --oc-shell-gutter: 18px;  /* ❌ Creates 18px gap */
}

body.vscode-light .oc-shell[data-oc-theme="codex"] {
  --oc-shell-gutter: 18px;  /* ❌ Creates 18px gap */
}

body.vscode-dark .oc-shell[data-oc-theme="claude"] {
  --oc-shell-gutter: 20px;  /* ❌ Creates 20px gap */
}

body.vscode-light .oc-shell[data-oc-theme="claude"] {
  --oc-shell-gutter: 20px;  /* ❌ Creates 20px gap */
}

/* After */
body.vscode-dark .oc-shell[data-oc-theme="codex"] {
  --oc-shell-gutter: 0px;  /* ✅ No gap */
}

body.vscode-light .oc-shell[data-oc-theme="codex"] {
  --oc-shell-gutter: 0px;  /* ✅ No gap */
}

body.vscode-dark .oc-shell[data-oc-theme="claude"] {
  --oc-shell-gutter: 0px;  /* ✅ No gap */
}

body.vscode-light .oc-shell[data-oc-theme="claude"] {
  --oc-shell-gutter: 0px;  /* ✅ No gap */
}
```

## Verification
All 6 theme variants now have `--oc-shell-gutter: 0px` in the compiled CSS:

```bash
$ grep -n "shell-gutter" dist/panel-webview.css
69:  --oc-shell-gutter: 0px;   # Default dark
134:  --oc-shell-gutter: 0px;  # Default light
175:  --oc-shell-gutter: 0px;  # Codex dark
215:  --oc-shell-gutter: 0px;  # Codex light
258:  --oc-shell-gutter: 0px;  # Claude dark
305:  --oc-shell-gutter: 0px;  # Claude light
```

## Visual Impact

### Before
```
┌─────────────────────────────────────┐
│ Viewport                            │
│  ┌───────────────────────────────┐  │
│  │ 18px/20px gap                 │  │
│  │   ┌───────────────────────┐   │  │
│  │   │ Content Area          │   │  │
│  │   │ (with background)     │   │  │
│  │   └───────────────────────┘   │  │
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### After
```
┌─────────────────────────────────────┐
│ Viewport                            │
│ ┌───────────────────────────────┐   │
│ │ Content Area                  │   │
│ │ (background fills entire      │   │
│ │  viewport width)              │   │
│ │                               │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Result
✅ Codex and Claude themes now have seamless full-width backgrounds, matching the default theme behavior
✅ No more "container-like" gaps on the sides
✅ Background gradients extend to the viewport edges
✅ Consistent visual experience across all themes

## Testing
To test the fix:
1. Compile the extension: `bun run compile`
2. Launch extension development host (F5 in VS Code)
3. Open an OpenCode session panel
4. Switch between themes (default, codex, claude)
5. Verify that all themes have full-width backgrounds with no side gaps

Alternatively, open `test-theme-gutter.html` in a browser to see a visual comparison.

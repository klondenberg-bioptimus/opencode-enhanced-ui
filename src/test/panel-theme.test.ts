import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, test } from "node:test"
import * as vscode from "vscode"
import { affectsDisplaySettings, getDisplaySettings } from "../core/settings"
import { resolvePanelThemeValue } from "../panel/webview/app/state"

const originalGetConfiguration = vscode.workspace.getConfiguration

afterEach(() => {
  ;(vscode.workspace as typeof vscode.workspace & {
    getConfiguration: typeof vscode.workspace.getConfiguration
  }).getConfiguration = originalGetConfiguration
})

describe("panel theme settings", () => {
  test("reads panelTheme from display settings", () => {
    ;(vscode.workspace as typeof vscode.workspace & {
      getConfiguration: typeof vscode.workspace.getConfiguration
    }).getConfiguration = ((section?: string) => ({
      get: <T,>(key: string, fallback: T) => {
        if (section === "opencode-ui" && key === "panelTheme") {
          return "claude" as T
        }
        return fallback
      },
    })) as typeof vscode.workspace.getConfiguration

    assert.equal(getDisplaySettings().panelTheme, "claude")
  })

  test("normalizes invalid panelTheme values to default", () => {
    ;(vscode.workspace as typeof vscode.workspace & {
      getConfiguration: typeof vscode.workspace.getConfiguration
    }).getConfiguration = ((section?: string) => ({
      get: <T,>(key: string, fallback: T) => {
        if (section === "opencode-ui" && key === "panelTheme") {
          return "invalid-theme" as T
        }
        return fallback
      },
    })) as typeof vscode.workspace.getConfiguration

    assert.equal(getDisplaySettings().panelTheme, "default")
  })

  test("treats panelTheme changes as display setting changes", () => {
    const event = {
      affectsConfiguration: (key: string) => key === "opencode-ui.panelTheme",
    } as vscode.ConfigurationChangeEvent

    assert.equal(affectsDisplaySettings(event), true)
  })

  test("resolves the panel root theme attribute value", () => {
    assert.equal(resolvePanelThemeValue("codex"), "codex")
    assert.equal(resolvePanelThemeValue(undefined), "default")
  })

  test("defines light and dark theme branches for the panel", () => {
    const css = readFileSync(resolve(process.cwd(), "src/panel/webview/theme.css"), "utf8")

    assert.match(css, /body\.vscode-dark/)
    assert.match(css, /body\.vscode-light/)
    assert.doesNotMatch(css, /:root\s*\{[^}]*color-scheme:\s*dark;/s)
  })

  test("defines codex and claude preset selectors", () => {
    const css = readFileSync(resolve(process.cwd(), "src/panel/webview/theme.css"), "utf8")

    assert.match(css, /\[data-oc-theme=\"codex\"\]/)
    assert.match(css, /\[data-oc-theme=\"claude\"\]/)
  })

  test("keeps the default dark preset aligned with the original hard-edged look", () => {
    const css = readFileSync(resolve(process.cwd(), "src/panel/webview/theme.css"), "utf8")

    assert.match(css, /body\.vscode-dark\s*\{[\s\S]*--oc-canvas:\s*#000;/)
    assert.match(css, /body\.vscode-dark\s*\{[\s\S]*--oc-surface-primary:\s*#000;/)
    assert.match(css, /body\.vscode-dark\s*\{[\s\S]*--oc-radius-md:\s*0px;/)
    assert.match(css, /body\.vscode-dark\s*\{[\s\S]*--oc-message-user-bg:\s*#000;/)
  })

  test("gives codex and claude clearly different visual signatures", () => {
    const css = readFileSync(resolve(process.cwd(), "src/panel/webview/theme.css"), "utf8")

    assert.match(css, /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=\"codex\"\]\s*\{[\s\S]*--oc-radius-md:\s*10px;/)
    assert.match(css, /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=\"claude\"\]\s*\{[\s\S]*--oc-radius-md:\s*20px;/)
    assert.match(css, /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=\"codex\"\]\s*\{[\s\S]*--oc-accent-strong:\s*#63a6ff;/)
    assert.match(css, /body\.vscode-dark\s+\.oc-shell\[data-oc-theme=\"claude\"\]\s*\{[\s\S]*--oc-accent-strong:\s*#d98d3f;/)
  })

  test("uses a frameless outer composer container", () => {
    const baseCss = readFileSync(resolve(process.cwd(), "src/panel/webview/base.css"), "utf8")
    const statusCss = readFileSync(resolve(process.cwd(), "src/panel/webview/status.css"), "utf8")

    assert.doesNotMatch(baseCss, /\.oc-dock,\n\.oc-composer,\n\.oc-questionCard/)
    assert.match(baseCss, /\.oc-composer\s*\{[\s\S]*border:\s*0;/)
    assert.match(baseCss, /\.oc-composer\s*\{[\s\S]*background:\s*transparent;/)
    assert.match(baseCss, /\.oc-composer\s*\{[\s\S]*padding:\s*0;/)
    assert.match(baseCss, /\.oc-composer\s*\{[\s\S]*gap:\s*8px;/)
    assert.match(statusCss, /\.oc-composerBody\s*\{[\s\S]*border:\s*1px solid var\(--oc-composer-border\);/)
  })

  test("keeps the compact composer footer bottom padding aligned with its tighter top gap", () => {
    const layoutCss = readFileSync(resolve(process.cwd(), "src/panel/webview/layout.css"), "utf8")

    assert.match(layoutCss, /\.oc-footer\s*\{[\s\S]*padding:\s*8px 0 4px;/)
  })

  test("uses a dedicated warm accent for skill pills instead of the old magenta fill", () => {
    const baseCss = readFileSync(resolve(process.cwd(), "src/panel/webview/base.css"), "utf8")
    const themeCss = readFileSync(resolve(process.cwd(), "src/panel/webview/theme.css"), "utf8")

    assert.match(baseCss, /\.oc-pill-skill\s+\.oc-pillFileType\s*\{[\s\S]*background:\s*var\(--oc-pill-skill-fill\);/)
    assert.doesNotMatch(baseCss, /--vscode-terminal-ansiMagenta/)
    assert.match(themeCss, /body\.vscode-dark\s*\{[\s\S]*--oc-pill-skill-fill:\s*#9f5f3f;/)
    assert.match(themeCss, /body\.vscode-light\s*\{[\s\S]*--oc-pill-skill-fill:\s*#c9743a;/)
  })

  test("uses a simple single-row composer footer that only wraps at very narrow widths", () => {
    const baseCss = readFileSync(resolve(process.cwd(), "src/panel/webview/base.css"), "utf8")
    const layoutCss = readFileSync(resolve(process.cwd(), "src/panel/webview/layout.css"), "utf8")
    const statusCss = readFileSync(resolve(process.cwd(), "src/panel/webview/status.css"), "utf8")

    assert.match(baseCss, /\.oc-composer\.is-compactFooter\s*\{[\s\S]*gap:\s*4px;/)
    assert.match(statusCss, /\.oc-composerActions\s*\{[\s\S]*display:\s*flex;/)
    assert.match(statusCss, /\.oc-composerActions\s*\{[\s\S]*align-items:\s*center;/)
    assert.match(statusCss, /\.oc-composerActions\s*\{[\s\S]*gap:\s*8px;/)
    assert.match(statusCss, /\.oc-composerActions\s*\{[\s\S]*padding:\s*4px 4px;/)
    assert.match(statusCss, /\.oc-composerActionsMain\s*\{[\s\S]*display:\s*flex;/)
    assert.doesNotMatch(statusCss, /\.oc-composerActionsMain\s*\{[\s\S]*min-height:\s*24px;/)
    assert.match(statusCss, /\.oc-composerContextWrap\s*\{[\s\S]*margin-left:\s*auto;/)
    assert.match(layoutCss, /@media\s*\(max-width:\s*480px\)\s*\{/)
    assert.match(statusCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.oc-composerActions\s*\{[\s\S]*flex-direction:\s*column;/)
    assert.match(statusCss, /@media\s*\(max-width:\s*480px\)\s*\{[\s\S]*\.oc-composerContextWrap\s*\{[\s\S]*margin-left:\s*0;/)
  })
})

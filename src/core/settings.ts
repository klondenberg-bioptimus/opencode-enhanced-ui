import * as vscode from "vscode"

export type DiffMode = "unified" | "split"

export type DisplaySettings = {
  showInternals: boolean
  showThinking: boolean
  diffMode: DiffMode
}

const SECTION = "opencode-ui"

export const HTTP_PROXY_KEY = "httpProxy"
export const SHOW_INTERNALS_KEY = "showInternals"
export const SHOW_THINKING_KEY = "showThinking"
export const DIFF_MODE_KEY = "diffMode"

export function getDisplaySettings(): DisplaySettings {
  const config = vscode.workspace.getConfiguration(SECTION)
  return {
    showInternals: config.get<boolean>(SHOW_INTERNALS_KEY, false),
    showThinking: config.get<boolean>(SHOW_THINKING_KEY, true),
    diffMode: config.get<DiffMode>(DIFF_MODE_KEY, "unified") === "split" ? "split" : "unified",
  }
}

export function getHttpProxy() {
  return vscode.workspace.getConfiguration(SECTION).get<string>(HTTP_PROXY_KEY, "").trim()
}

export function affectsDisplaySettings(event: vscode.ConfigurationChangeEvent) {
  return event.affectsConfiguration(`${SECTION}.${SHOW_INTERNALS_KEY}`)
    || event.affectsConfiguration(`${SECTION}.${SHOW_THINKING_KEY}`)
    || event.affectsConfiguration(`${SECTION}.${DIFF_MODE_KEY}`)
}

export function affectsHttpProxySetting(event: vscode.ConfigurationChangeEvent) {
  return event.affectsConfiguration(`${SECTION}.${HTTP_PROXY_KEY}`)
}

export function openSettingsQuery() {
  return "@ext:zgy.opencode-vscode-ui"
}

export function proxyRestartMessage() {
  return "OpenCode UI HTTP proxy changed. Restart the editor to apply it to opencode serve."
}

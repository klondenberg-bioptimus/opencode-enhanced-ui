import * as vscode from "vscode"
import { isMissingOpencodeError } from "../core/runtime-errors"
import type { SessionInfo, SessionStatus } from "../core/sdk"
import type { WorkspaceRuntime } from "../core/server"

export class WorkspaceItem extends vscode.TreeItem {
  constructor(
    readonly runtime: WorkspaceRuntime,
    searchActive = false,
  ) {
    super(runtime.name, vscode.TreeItemCollapsibleState.Expanded)
    this.id = runtime.workspaceId
    this.description = desc(runtime)
    this.tooltip = `${runtime.dir}\n${runtime.url}`
    this.contextValue = searchActive ? "workspace-searching" : "workspace"
    this.iconPath = icon(runtime.state)
  }
}

export class StatusItem extends vscode.TreeItem {
  constructor(label: string, description?: string) {
    super(label, vscode.TreeItemCollapsibleState.None)
    this.label = label
    this.description = description
    this.contextValue = "status"
  }
}

export class SessionItem extends vscode.TreeItem {
  constructor(
    readonly runtime: Pick<WorkspaceRuntime, "workspaceId" | "dir">,
    readonly session: SessionInfo,
    status?: SessionStatus,
  ) {
    super(session.title || session.id.slice(0, 8), vscode.TreeItemCollapsibleState.None)
    this.id = `${runtime.workspaceId}:${session.id}`
    this.description = session.id.slice(0, 8)
    this.tooltip = `${session.title || session.id}\n${session.id}\n${runtime.dir}`
    this.contextValue = "session"
    this.iconPath = status?.type === "busy"
      ? new vscode.ThemeIcon("loading~spin")
      : new vscode.ThemeIcon("comment-discussion")
    this.command = {
      command: "opencode-ui.openSession",
      title: "Open Session",
      arguments: [this],
    }
  }
}

export class ClearSearchItem extends vscode.TreeItem {
  constructor(readonly runtime: Pick<WorkspaceRuntime, "workspaceId">) {
    super("Clear Search", vscode.TreeItemCollapsibleState.None)
    this.id = `${runtime.workspaceId}:clear-search`
    this.contextValue = "clear-search"
    this.iconPath = new vscode.ThemeIcon("close")
    this.command = {
      command: "opencode-ui.clearWorkspaceSessionSearch",
      title: "Clear Session Search",
      arguments: [this],
    }
  }
}

function desc(runtime: WorkspaceRuntime) {
  if (runtime.state === "ready") {
    return `ready :${runtime.port}`
  }

  if (runtime.state === "starting") {
    return `starting :${runtime.port}`
  }

  if (runtime.state === "error") {
    if (isMissingOpencodeError(runtime.err)) {
      return "missing opencode"
    }

    return "error"
  }

  return "stopped"
}

function icon(state: WorkspaceRuntime["state"]) {
  if (state === "ready") {
    return new vscode.ThemeIcon("check")
  }

  if (state === "starting") {
    return new vscode.ThemeIcon("sync")
  }

  if (state === "error") {
    return new vscode.ThemeIcon("error")
  }

  return new vscode.ThemeIcon("circle-slash")
}

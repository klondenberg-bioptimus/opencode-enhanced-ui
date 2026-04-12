import * as vscode from "vscode"
import type { SessionInfo, SessionStatus } from "../core/sdk"
import type { WorkspaceRuntime } from "../core/server"
import { isMissingOpencodeError, missingOpencodeMessage } from "../core/runtime-errors"
import { SessionStore } from "../core/session"
import { WorkspaceManager } from "../core/workspace"
import { ClearSearchItem, SessionItem, StatusItem, WorkspaceItem } from "./item"

export type WorkspaceSearchState = {
  query: string
  status: "loading" | "ready" | "error"
  results: SessionInfo[]
  error?: string
}

type WorkspaceChildrenInput = {
  runtime: Pick<WorkspaceRuntime, "workspaceId" | "dir" | "name" | "state" | "sessionsState" | "sessionsErr" | "sessionStatuses" | "err" | "url" | "port">
  sessions: SessionInfo[]
  statuses: Map<string, SessionStatus>
  search?: WorkspaceSearchState
}

export function setWorkspaceSearchLoading(
  state: Map<string, WorkspaceSearchState>,
  workspaceId: string,
  query: string,
) {
  state.set(workspaceId, {
    query,
    status: "loading",
    results: [],
  })
}

export function setWorkspaceSearchResult(
  state: Map<string, WorkspaceSearchState>,
  workspaceId: string,
  query: string,
  results: SessionInfo[],
) {
  state.set(workspaceId, {
    query,
    status: "ready",
    results,
  })
}

export function setWorkspaceSearchError(
  state: Map<string, WorkspaceSearchState>,
  workspaceId: string,
  query: string,
  error: string,
) {
  state.set(workspaceId, {
    query,
    status: "error",
    results: [],
    error,
  })
}

export function clearWorkspaceSearchState(
  state: Map<string, WorkspaceSearchState>,
  workspaceId: string,
) {
  state.delete(workspaceId)
}

export function getWorkspaceSearchQuery(
  state: Map<string, WorkspaceSearchState>,
  workspaceId: string,
) {
  return state.get(workspaceId)?.query
}

export function buildWorkspaceChildren(input: WorkspaceChildrenInput) {
  if (input.runtime.state === "starting") {
    return [new StatusItem(`Starting server on ${input.runtime.url}`)]
  }

  if (input.runtime.state === "error") {
    if (isMissingOpencodeError(input.runtime.err)) {
      return [new StatusItem("opencode is not available", missingOpencodeMessage(input.runtime))]
    }

    return [new StatusItem(input.runtime.err ? `Error: ${input.runtime.err}` : "Server failed")]
  }

  if (input.runtime.state !== "ready") {
    return [new StatusItem("Server stopped")]
  }

  if (input.runtime.sessionsState === "loading" && !input.sessions.length && !input.search) {
    return [new StatusItem("Loading sessions...")]
  }

  if (input.search?.status === "loading") {
    return [new ClearSearchItem(input.runtime), new StatusItem("Searching sessions...")]
  }

  if (input.search?.status === "error") {
    return [new ClearSearchItem(input.runtime), new StatusItem(`Search error: ${input.search.error || "Unknown error"}`)]
  }

  if (input.search) {
    const list = input.search.results.map((session) => new SessionItem(input.runtime, session, input.statuses.get(session.id)))
    return list.length
      ? [new ClearSearchItem(input.runtime), ...list]
      : [new ClearSearchItem(input.runtime), new StatusItem("No matching sessions")]
  }

  const list = input.sessions.map((session) => new SessionItem(input.runtime, session, input.statuses.get(session.id)))

  if (input.runtime.sessionsErr) {
    return [new StatusItem(`Session error: ${input.runtime.sessionsErr}`), ...list]
  }

  if (list.length) {
    return list
  }

  return [new StatusItem("No sessions")]
}

export class SidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private change = new vscode.EventEmitter<void>()
  private search = new Map<string, WorkspaceSearchState>()

  readonly onDidChangeTreeData = this.change.event

  constructor(
    private mgr: WorkspaceManager,
    private sessions: SessionStore,
  ) {
    this.mgr.onDidChange(() => {
      this.refresh()
    })
  }

  refresh() {
    this.change.fire()
  }

  getTreeItem(item: vscode.TreeItem) {
    return item
  }

  getChildren(item?: vscode.TreeItem) {
    if (!item) {
      const list = this.mgr.list()

      if (list.length) {
        return list.map((rt) => new WorkspaceItem(rt, this.search.has(rt.workspaceId)))
      }

      return [new StatusItem("No workspace folders open")]
    }

    if (item instanceof WorkspaceItem) {
      const rt = this.mgr.get(item.runtime.workspaceId) ?? item.runtime
      return buildWorkspaceChildren({
        runtime: rt,
        sessions: this.sessions.list(rt.workspaceId),
        statuses: rt.sessionStatuses,
        search: this.search.get(rt.workspaceId),
      })
    }

    return []
  }

  setSearchLoading(workspaceId: string, query: string) {
    setWorkspaceSearchLoading(this.search, workspaceId, query)
    this.refresh()
  }

  setSearchResult(workspaceId: string, query: string, results: SessionInfo[]) {
    setWorkspaceSearchResult(this.search, workspaceId, query, results)
    this.refresh()
  }

  setSearchError(workspaceId: string, query: string, error: string) {
    setWorkspaceSearchError(this.search, workspaceId, query, error)
    this.refresh()
  }

  clearSearch(workspaceId: string) {
    clearWorkspaceSearchState(this.search, workspaceId)
    this.refresh()
  }

  searchQuery(workspaceId: string) {
    return getWorkspaceSearchQuery(this.search, workspaceId)
  }

  dispose() {
    this.change.dispose()
  }
}

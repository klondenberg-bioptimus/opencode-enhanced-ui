import React from "react"
import type { ComposerPathResult, HostMessage } from "../../../bridge/types"
import { bootstrapFromSnapshot, normalizeSnapshotPayload, type AppState, type VsCodeApi } from "../app/state"

export function dispatchHostMessage(message: HostMessage, handlers: {
  fileRefStatus: Map<string, boolean>
  onFileSearchResults: (payload: { requestID: string; query: string; results: ComposerPathResult[] }) => void
  onRestoreComposer: (payload: { parts: import("../../../bridge/types").ComposerPromptPart[] }) => void
  onShellCommandSucceeded: () => void
  setPendingMcpActions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setState: React.Dispatch<React.SetStateAction<AppState>>
}) {
  if (message?.type === "bootstrap") {
    handlers.setState((current) => ({ ...current, bootstrap: message.payload, error: "" }))
    return
  }

  if (message?.type === "snapshot") {
    handlers.setState((current) => ({
      ...current,
      bootstrap: bootstrapFromSnapshot(message.payload),
      snapshot: normalizeSnapshotPayload(message.payload),
      error: "",
    }))
    return
  }

  if (message?.type === "error") {
    handlers.setState((current) => ({ ...current, error: message.message || "Unknown error" }))
    return
  }

  if (message?.type === "fileRefsResolved") {
    for (const item of message.refs) {
      handlers.fileRefStatus.set(item.key, item.exists)
    }
    window.dispatchEvent(new CustomEvent("oc-file-refs-updated"))
    return
  }

  if (message?.type === "fileSearchResults") {
    handlers.onFileSearchResults(message)
    return
  }

  if (message?.type === "restoreComposer") {
    handlers.onRestoreComposer(message)
    return
  }

  if (message?.type === "shellCommandSucceeded") {
    handlers.onShellCommandSucceeded()
    return
  }

  if (message?.type === "mcpActionFinished") {
    handlers.setPendingMcpActions((current) => {
      if (!current[message.name]) {
        return current
      }
      const next = { ...current }
      delete next[message.name]
      return next
    })
  }
}

export function useHostMessages({
  fileRefStatus,
  onFileSearchResults,
  onRestoreComposer,
  onShellCommandSucceeded,
  setPendingMcpActions,
  setState,
  vscode,
}: {
  fileRefStatus: Map<string, boolean>
  onFileSearchResults: (payload: { requestID: string; query: string; results: ComposerPathResult[] }) => void
  onRestoreComposer: (payload: { parts: import("../../../bridge/types").ComposerPromptPart[] }) => void
  onShellCommandSucceeded: () => void
  setPendingMcpActions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setState: React.Dispatch<React.SetStateAction<AppState>>
  vscode: VsCodeApi
}) {
  const fileSearchHandlerRef = React.useRef(onFileSearchResults)
  const restoreComposerHandlerRef = React.useRef(onRestoreComposer)
  const shellSucceededHandlerRef = React.useRef(onShellCommandSucceeded)

  React.useEffect(() => {
    fileSearchHandlerRef.current = onFileSearchResults
  }, [onFileSearchResults])

  React.useEffect(() => {
    restoreComposerHandlerRef.current = onRestoreComposer
  }, [onRestoreComposer])

  React.useEffect(() => {
    shellSucceededHandlerRef.current = onShellCommandSucceeded
  }, [onShellCommandSucceeded])

  React.useEffect(() => {
    const handler = (event: MessageEvent<HostMessage>) => {
      dispatchHostMessage(event.data, {
        fileRefStatus,
        onFileSearchResults: (payload) => fileSearchHandlerRef.current(payload),
        onRestoreComposer: (payload) => restoreComposerHandlerRef.current(payload),
        onShellCommandSucceeded: () => shellSucceededHandlerRef.current(),
        setPendingMcpActions,
        setState,
      })
    }

    window.addEventListener("message", handler)
    vscode.postMessage({ type: "ready" })
    return () => window.removeEventListener("message", handler)
  }, [fileRefStatus, setPendingMcpActions, setState, vscode])
}

import React from "react"
import type { SessionBootstrap } from "../../../bridge/types"
import type { QuestionRequest } from "../../../core/sdk"
import { ChildMessagesContext, ChildSessionsContext, WorkspaceDirContext } from "./contexts"
import { answerKey, PermissionDock, QuestionDock, RetryStatus, SessionNav, SubagentNotice } from "./docks"
import { createInitialState, type AppState, type VsCodeApi } from "./state"
import { Timeline } from "./timeline"
import { AgentBadge, CompactionDivider, EmptyState, MarkdownBlock, PartView, WebviewBindingsProvider } from "./webview-bindings"
import { resizeComposer, useComposerResize } from "../hooks/useComposer"
import { useComposerAutocomplete, type ComposerAutocompleteItem, type ComposerAutocompleteState } from "../hooks/useComposerAutocomplete"
import { useHostMessages } from "../hooks/useHostMessages"
import { useModifierState } from "../hooks/useModifierState"
import { useTimelineScroll } from "../hooks/useTimelineScroll"
import { agentColor, composerIdentity, composerMetrics, composerSelection, formatUsd, isSessionRunning, overallLspStatus, overallMcpStatus, sessionTitle, type StatusItem, type StatusTone } from "../lib/session-meta"

declare global {
  interface Window {
    __OPENCODE_INITIAL_STATE__?: SessionBootstrap["sessionRef"] | null
  }
}

declare function acquireVsCodeApi(): VsCodeApi

const vscode = acquireVsCodeApi()
const initialRef = window.__OPENCODE_INITIAL_STATE__ ?? null
const fileRefStatus = new Map<string, boolean>()

if (initialRef) {
  vscode.setState(initialRef)
}

export function App() {
  const [state, setState] = React.useState(() => createInitialState(initialRef))
  const [pendingMcpActions, setPendingMcpActions] = React.useState<Record<string, boolean>>({})
  const timelineRef = React.useRef<HTMLDivElement | null>(null)
  const composerRef = React.useRef<HTMLTextAreaElement | null>(null)
  const composerMenuItems = React.useMemo(() => buildComposerMenuItems(state), [state])
  const composerAutocomplete = useComposerAutocomplete(composerMenuItems)

  const blocked = state.snapshot.permissions.length > 0 || state.snapshot.questions.length > 0
  const isChildSession = !!state.bootstrap.session?.parentID
  const firstPermission = state.snapshot.permissions[0]
  const firstQuestion = state.snapshot.questions[0]

  useHostMessages({ fileRefStatus, setPendingMcpActions, setState, vscode })
  useComposerResize(composerRef, state.draft)
  useTimelineScroll(timelineRef, [state.snapshot.messages, state.snapshot.submitting, state.snapshot.permissions, state.snapshot.questions])
  useModifierState()

  React.useEffect(() => {
    document.title = `OpenCode: ${sessionTitle(state.bootstrap)}`
  }, [state.bootstrap])


  const submit = React.useCallback(() => {
    const text = state.draft.trim()
    if (!text || blocked) {
      return
    }

    const selection = composerSelection({ ...state.snapshot, composerAgentOverride: state.composerAgentOverride })
    vscode.postMessage({
      type: "submit",
      text,
      agent: selection.agent,
      model: selection.model,
    })
    setState((current) => ({
      ...current,
      draft: "",
      composerAgentOverride: undefined,
      error: "",
    }))
  }, [blocked, state.composerAgentOverride, state.draft, state.snapshot])

  const acceptComposerAutocomplete = React.useCallback((item: ComposerAutocompleteItem) => {
    if (item.kind === "action") {
      if (item.id === "slash-clear") {
        setState((current) => ({ ...current, draft: "", error: "" }))
        composerAutocomplete.close()
        return
      }

      if (item.id === "slash-reset-agent") {
        setState((current) => ({
          ...current,
          draft: "",
          composerAgentOverride: undefined,
          error: "",
        }))
        composerAutocomplete.close()
        return
      }

      if (item.id === "slash-refresh") {
        vscode.postMessage({ type: "composerAction", action: "refreshSession" })
        composerAutocomplete.close()
        return
      }
    }

    if (item.kind === "agent") {
      setState((current) => ({
        ...current,
        draft: removeComposerMentionToken(current.draft, composerRef.current?.selectionStart),
        composerAgentOverride: item.id.slice("agent:".length),
        error: "",
      }))
      composerAutocomplete.close()
      window.setTimeout(() => {
        const next = composerRef.current
        if (!next) {
          return
        }
        next.focus()
        const end = next.value.length
        next.setSelectionRange(end, end)
        resizeComposer(next)
      }, 0)
    }
  }, [composerAutocomplete, setState])

  const sendQuestionReply = React.useCallback((request: QuestionRequest) => {
    const answers = request.questions.map((_item, index) => {
      const key = answerKey(request.id, index)
      const base = state.form.selected[key] ?? []
      const custom = (state.form.custom[key] ?? "").trim()
      return custom ? [...base, custom] : base
    })

    vscode.postMessage({
      type: "questionReply",
      requestID: request.id,
      answers,
    })

    setState((current) => ({ ...current, error: "" }))
  }, [state.form.custom, state.form.selected])

  return (
    <WorkspaceDirContext.Provider value={state.bootstrap.sessionRef.dir || ""}>
      <ChildMessagesContext.Provider value={state.snapshot.childMessages}>
        <ChildSessionsContext.Provider value={state.snapshot.childSessions}>
          <WebviewBindingsProvider fileRefStatus={fileRefStatus} vscode={vscode}>
          <div className="oc-shell">
            <main ref={timelineRef} className="oc-transcript">
              <div className="oc-transcriptInner">
                <Timeline state={state} AgentBadge={AgentBadge} CompactionDivider={CompactionDivider} EmptyState={EmptyState} MarkdownBlock={MarkdownBlock} PartView={PartView} />
              </div>
            </main>

            <footer className="oc-footer">
              <div className="oc-transcriptInner oc-footerInner">
          {firstPermission ? (
            <PermissionDock
              request={firstPermission}
              currentSessionID={state.bootstrap.session?.id || state.bootstrap.sessionRef.sessionId}
              rejectMessage={state.form.reject[firstPermission.id] ?? ""}
              onRejectMessage={(value: string) => {
                setState((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    reject: {
                      ...current.form.reject,
                      [firstPermission.id]: value,
                    },
                  },
                }))
              }}
              onReply={(reply: "once" | "always" | "reject", message?: string) => {
                vscode.postMessage({ type: "permissionReply", requestID: firstPermission.id, reply, message })
                setState((current) => ({ ...current, error: "" }))
              }}
            />
          ) : null}
          {firstQuestion ? (
            <QuestionDock
              request={firstQuestion}
              form={state.form}
              onOption={(index, label, multiple) => {
                const key = answerKey(firstQuestion.id, index)
                if (!multiple && firstQuestion.questions.length === 1) {
                  vscode.postMessage({
                    type: "questionReply",
                    requestID: firstQuestion.id,
                    answers: [[label]],
                  })
                  setState((current) => ({ ...current, error: "" }))
                  return
                }

                setState((current) => {
                  const next = current.form.selected[key] ?? []
                  return {
                    ...current,
                    form: {
                      ...current.form,
                      selected: {
                        ...current.form.selected,
                        [key]: multiple
                          ? (next.includes(label) ? next.filter((item) => item !== label) : [...next, label])
                          : [label],
                      },
                      custom: multiple ? current.form.custom : {
                        ...current.form.custom,
                        [key]: "",
                      },
                    },
                  }
                })
              }}
              onCustom={(index, value) => {
                const key = answerKey(firstQuestion.id, index)
                setState((current) => ({
                  ...current,
                  form: {
                    ...current.form,
                    selected: firstQuestion.questions[index]?.multiple ? current.form.selected : {
                      ...current.form.selected,
                      [key]: value.trim() ? [] : (current.form.selected[key] ?? []),
                    },
                    custom: {
                      ...current.form.custom,
                      [key]: value,
                    },
                  },
                }))
              }}
              onReject={() => {
                vscode.postMessage({ type: "questionReject", requestID: firstQuestion.id })
                setState((current) => ({ ...current, error: "" }))
              }}
              onSubmit={() => sendQuestionReply(firstQuestion)}
            />
          ) : null}
          {!blocked && !isChildSession ? <RetryStatus status={state.snapshot.sessionStatus} /> : null}
          {isChildSession ? <SessionNav navigation={state.snapshot.navigation} onNavigate={(sessionID) => vscode.postMessage({ type: "navigateSession", sessionID })} /> : null}

          {!blocked && !isChildSession ? (
            <section className="oc-composer">
              <div className="oc-composerInputWrap">
                <textarea
                  ref={composerRef}
                  className="oc-composerInput"
                  rows={1}
                  value={state.draft}
                  onChange={(event) => {
                    const value = event.currentTarget.value
                    composerAutocomplete.sync(value, event.currentTarget.selectionStart)
                    setState((current) => ({ ...current, draft: value }))
                  }}
                  onInput={(event) => resizeComposer(event.currentTarget)}
                  onSelect={(event) => {
                    composerAutocomplete.sync(event.currentTarget.value, event.currentTarget.selectionStart)
                  }}
                  onFocus={(event) => {
                    composerAutocomplete.sync(event.currentTarget.value, event.currentTarget.selectionStart)
                  }}
                  onBlur={() => {
                    window.setTimeout(() => composerAutocomplete.close(), 0)
                  }}
                  onKeyDown={(event) => {
                    if (composerAutocomplete.state) {
                      if (event.key === "ArrowDown") {
                        event.preventDefault()
                        composerAutocomplete.move(1)
                        return
                      }

                      if (event.key === "ArrowUp") {
                        event.preventDefault()
                        composerAutocomplete.move(-1)
                        return
                      }

                      if (event.key === "Escape") {
                        event.preventDefault()
                        composerAutocomplete.close()
                        return
                      }

                      if ((event.key === "Enter" && !(event.metaKey || event.ctrlKey)) || event.key === "Tab") {
                        event.preventDefault()
                        if (composerAutocomplete.currentItem) {
                          acceptComposerAutocomplete(composerAutocomplete.currentItem)
                        }
                        return
                      }
                    }

                    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) {
                      return
                    }
                    event.preventDefault()
                    submit()
                }}
                placeholder="Ask OpenCode to inspect, explain, or change this workspace."
                disabled={state.bootstrap.status !== "ready" || blocked}
              />
              {composerAutocomplete.state ? <ComposerAutocompletePopup state={composerAutocomplete.state} onSelect={acceptComposerAutocomplete} /> : null}
              <ComposerInfo state={state} />
            </div>
            <div className="oc-composerActions">
              <div className="oc-composerContextWrap">
                <ComposerMetrics state={state} />
                {state.error ? <div className="oc-errorText oc-composerErrorText">{state.error}</div> : null}
              </div>
          <ComposerStatusBadges state={state} pendingMcpActions={pendingMcpActions} onMcpActionStart={(name) => setPendingMcpActions((current) => ({ ...current, [name]: true }))} />
            </div>
            </section>
          ) : null}

              {!blocked && isChildSession ? <SubagentNotice /> : null}
              </div>
            </footer>
          </div>
          </WebviewBindingsProvider>
        </ChildSessionsContext.Provider>
      </ChildMessagesContext.Provider>
    </WorkspaceDirContext.Provider>
  )
}

function ComposerAutocompletePopup({ state, onSelect }: { state: ComposerAutocompleteState; onSelect: (item: ComposerAutocompleteItem) => void }) {
  if (!state) {
    return null
  }

  return (
    <div className="oc-composerAutocomplete" role="listbox" aria-label={`${state.trigger} suggestions`}>
      <div className="oc-composerAutocompleteHeader">
        <span className="oc-composerAutocompleteTrigger">{state.trigger === "slash" ? "/" : "@"}</span>
        <span>{state.query ? `Filter: ${state.query}` : "Start typing to filter"}</span>
      </div>
      <div className="oc-composerAutocompleteList">
        {state.items.length > 0 ? state.items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={`oc-composerAutocompleteItem${index === state.selectedIndex ? " is-active" : ""}`}
            role="option"
            aria-selected={index === state.selectedIndex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <div className="oc-composerAutocompleteLabelWrap">
              <div className="oc-composerAutocompleteLabel">{item.label}</div>
              <div className="oc-composerAutocompleteDetail" title={item.detail}>{item.detail}</div>
              <div className="oc-composerAutocompleteKind">{item.kind}</div>
            </div>
          </button>
        )) : (
          <div className="oc-composerAutocompleteEmpty">No matches</div>
        )}
      </div>
    </div>
  )
}

function ComposerInfo({ state }: { state: AppState }) {
  const info = composerIdentity({ ...state.snapshot, composerAgentOverride: state.composerAgentOverride })
  const running = isSessionRunning(state.snapshot.sessionStatus)
  return (
    <div className="oc-composerInfo" aria-hidden="true">
      <div className="oc-composerInfoSpacer" />
      <div className="oc-composerInfoRow">
        <span className="oc-composerIdentityStart">
          <span className="oc-composerAgent" style={{ color: agentColor(info.agent) }}>{info.agent}</span>
          <ComposerRunningIndicator running={running} />
        </span>
        {info.model ? <span className="oc-composerModel" title={info.model}>{info.model}</span> : null}
        {info.provider ? <span className="oc-composerProvider" title={info.provider}>{info.provider}</span> : null}
      </div>
    </div>
  )
}

function buildComposerMenuItems(state: AppState): ComposerAutocompleteItem[] {
  const slashItems: ComposerAutocompleteItem[] = [
    {
      id: "slash-refresh",
      label: "refresh",
      detail: "Ask the host to reload the current session snapshot.",
      keywords: ["reload", "snapshot", "panel", "host"],
      trigger: "slash",
      kind: "action",
    },
    {
      id: "slash-clear",
      label: "clear",
      detail: "Clear the current composer draft locally.",
      keywords: ["reset", "draft", "composer"],
      trigger: "slash",
      kind: "action",
    },
  ]

  if (state.composerAgentOverride) {
    slashItems.push({
      id: "slash-reset-agent",
      label: "reset-agent",
      detail: "Return the composer to the default agent selection.",
      keywords: ["agent", "default", "override"],
      trigger: "slash",
      kind: "action",
    })
  }

  const agentItems = state.snapshot.agents.map((agent) => ({
    id: `agent:${agent.name}`,
    label: agent.name,
    detail: agent.mode === "subagent" ? "Subagent" : agent.mode === "primary" ? "Primary agent" : "Agent",
    keywords: [agent.mode, agent.variant ?? ""].filter(Boolean),
    trigger: "mention" as const,
    kind: "agent" as const,
  }))

  return [...slashItems, ...agentItems]
}

function removeComposerMentionToken(value: string, cursor: number | null | undefined) {
  if (typeof cursor !== "number" || cursor < 1) {
    return value
  }

  let start = cursor - 1
  while (start >= 0) {
    const char = value[start]
    if (char === "@") {
      const prev = start === 0 ? "" : value[start - 1]
      if (prev && !/\s/.test(prev)) {
        return value
      }
      return `${value.slice(0, start)}${value.slice(cursor)}`.replace(/ {2,}/g, " ").trimStart()
    }
    if (/\s/.test(char)) {
      return value
    }
    start -= 1
  }

  return value
}

function ComposerRunningIndicator({ running }: { running: boolean }) {
  return <span className={`oc-composerRunBar${running ? " is-running" : ""}`} aria-label="running" />
}

function ComposerMetrics({ state }: { state: AppState }) {
  const metrics = composerMetrics(state.snapshot)
  const items = [
    `${metrics.tokens.toLocaleString()} tokens`,
    typeof metrics.percent === "number" ? `${metrics.percent}%` : "",
    formatUsd(metrics.cost),
  ].filter(Boolean)
  return (
    <div className="oc-contextRow">
      {items.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 ? <span aria-hidden="true">·</span> : null}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

function ComposerStatusBadges({ state, pendingMcpActions, onMcpActionStart }: { state: AppState; pendingMcpActions: Record<string, boolean>; onMcpActionStart: (name: string) => void }) {
  const mcp = overallMcpStatus(state.snapshot.mcp)
  const lsp = overallLspStatus(state.snapshot.lsp)
  return (
    <div className="oc-actionRow oc-composerBadgeRow">
      <StatusBadge label="MCP" tone={mcp.tone} items={mcp.items} pendingActions={pendingMcpActions} onActionStart={onMcpActionStart} />
      <StatusBadge label="LSP" tone={lsp.tone} items={lsp.items} />
    </div>
  )
}

function StatusBadge(props: { label: string; tone: StatusTone; items: StatusItem[]; pendingActions?: Record<string, boolean>; onActionStart?: (name: string) => void }) {
  const { label, tone, items, pendingActions, onActionStart } = props
  return (
    <div className="oc-statusBadgeWrap">
      <div className="oc-statusBadge">
        <span className={`oc-statusLight is-${tone}`} />
        <span>{label}</span>
      </div>
      {items.length > 0 ? (
        <div className="oc-statusPopover">
          {items.map((item) => (
            <div key={`${label}-${item.name}`} className="oc-statusPopoverItem">
              <span className={`oc-statusLight is-${item.tone}`} />
              <span className="oc-statusPopoverName">{item.name}</span>
              <span className="oc-statusPopoverValue" title={item.value}>{item.value}</span>
              {item.action ? <StatusPopoverAction item={item} pending={!!pendingActions?.[item.name]} onActionStart={onActionStart} /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function StatusPopoverAction({ item, pending, onActionStart }: { item: StatusItem; pending: boolean; onActionStart?: (name: string) => void }) {
  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!item.action || pending) {
      return
    }
    onActionStart?.(item.name)
    vscode.postMessage({ type: "toggleMcp", name: item.name, action: item.action })
  }

  return (
    <button type="button" disabled={pending} className={`oc-statusPopoverAction${item.action === "disconnect" ? " is-disconnect" : ""}${item.action === "connect" ? " is-connect" : ""}${pending ? " is-pending" : ""}`} onClick={onClick} title={item.actionLabel} aria-label={item.actionLabel}>
      {item.action === "disconnect" ? <DisconnectIcon /> : null}
      {item.action === "connect" ? <ConnectIcon /> : null}
      {item.action === "reconnect" ? <ReconnectIcon /> : null}
    </button>
  )
}

function ConnectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 22L6 18" className="oc-statusActionPath" />
      <rect x="5" y="13" width="7" height="5" rx="1" transform="rotate(-45 8.5 15.5)" className="oc-statusActionPath" />
      <path d="M8 14L10 12" className="oc-statusActionPath" />
      <path d="M10 16L12 14" className="oc-statusActionPath" />
      <rect x="12" y="6" width="7" height="5" rx="1" transform="rotate(-45 15.5 8.5)" className="oc-statusActionPath" />
      <path d="M18 6L22 2" className="oc-statusActionPath" />
    </svg>
  )
}

function DisconnectIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 22L6 18" className="oc-statusActionPath" />
      <rect x="5" y="13" width="7" height="5" rx="1" transform="rotate(-45 8.5 15.5)" className="oc-statusActionPath" />
      <path d="M8 14L10 12" className="oc-statusActionPath" />
      <path d="M10 16L12 14" className="oc-statusActionPath" />
      <rect x="12" y="6" width="7" height="5" rx="1" transform="rotate(-45 15.5 8.5)" className="oc-statusActionPath" />
      <path d="M18 6L22 2" className="oc-statusActionPath" />
      <path d="M4 4L20 20" className="oc-statusActionPath" />
    </svg>
  )
}

function ReconnectIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.5 6.5A4.5 4.5 0 0 0 5.25 4" className="oc-statusActionPath" />
      <path d="M4.75 2.75v2.5h2.5" className="oc-statusActionPath" />
      <path d="M3.5 9.5A4.5 4.5 0 0 0 10.75 12" className="oc-statusActionPath" />
      <path d="M11.25 13.25v-2.5h-2.5" className="oc-statusActionPath" />
    </svg>
  )
}

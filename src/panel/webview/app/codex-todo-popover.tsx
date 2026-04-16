import React from "react"

import type { Todo } from "../../../core/sdk"

type CodexTodoPopoverProps = {
  todos: Todo[]
  collapsed?: boolean
  onToggle?: () => void
}

export function CodexTodoPopover({ todos, collapsed = false, onToggle }: CodexTodoPopoverProps) {
  if (todos.length === 0) {
    return null
  }

  const completed = todos.filter((item) => item.status === "completed").length

  return (
    <section className={`oc-codexTodoPopover${collapsed ? " is-collapsed" : ""}`} aria-label="Tracked tasks">
      <div className="oc-codexTodoHeader">
        <div className="oc-codexTodoHeaderText">
          <span className="oc-codexTodoEyebrow">ACTIVE TASKS</span>
          <span className="oc-codexTodoSummary">共 {todos.length} 个任务，已经完成 {completed} 个</span>
        </div>
        <button
          type="button"
          className={`oc-codexTodoToggle${collapsed ? " is-collapsed" : ""}`}
          aria-label={collapsed ? "Expand task list" : "Collapse task list"}
          aria-expanded={collapsed ? "false" : "true"}
          onClick={onToggle}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="oc-codexTodoToggleIcon">
            <path d="M5 2.5H2.5V5" className="oc-codexTodoTogglePath" />
            <path d="M11 13.5H13.5V11" className="oc-codexTodoTogglePath" />
            <path d="M2.5 5 6 1.5" className="oc-codexTodoTogglePath" />
            <path d="M10 14.5 13.5 11" className="oc-codexTodoTogglePath" />
          </svg>
        </button>
      </div>
      {!collapsed ? (
        <div className="oc-codexTodoList">
          {todos.map((item) => (
            <div key={`${item.status}:${item.content}`} className={`oc-codexTodoItem is-${item.status}`}>
              <span className="oc-codexTodoMarker" aria-hidden="true" />
              <span className={`oc-codexTodoText is-${item.status}`}>{item.content}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

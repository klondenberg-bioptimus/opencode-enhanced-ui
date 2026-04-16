import React from "react"

import type { Todo } from "../../../core/sdk"

export function CodexTodoPopover({ todos }: { todos: Todo[] }) {
  if (todos.length === 0) {
    return null
  }

  const completed = todos.filter((item) => item.status === "completed").length

  return (
    <section className="oc-codexTodoPopover" aria-label="Tracked tasks">
      <div className="oc-codexTodoHeader">
        <span className="oc-codexTodoSummary">共 {todos.length} 个任务，已经完成 {completed} 个</span>
      </div>
      <div className="oc-codexTodoList">
        {todos.map((item) => (
          <div key={`${item.status}:${item.content}`} className={`oc-codexTodoItem is-${item.status}`}>
            <span className="oc-codexTodoMarker" aria-hidden="true" />
            <span className="oc-codexTodoText">{item.content}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

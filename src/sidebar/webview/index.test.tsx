import assert from "node:assert/strict"
import { describe, test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { SidebarViewState } from "../view-types"
import { TodoList } from "./index"

describe("sidebar todo list", () => {
  test("does not render the session title under each todo item", () => {
    const state: SidebarViewState = {
      status: "ready",
      mode: "todo",
      sessionTitle: "Fujian milestones planning",
      todos: [
        {
          content: "Research and define the time period",
          status: "pending",
          priority: "medium",
        },
      ],
      diff: [],
    }

    const html = renderToStaticMarkup(<TodoList state={state} />)

    assert.equal(html.includes("Research and define the time period"), true)
    assert.equal(html.includes("Fujian milestones planning"), false)
  })
})

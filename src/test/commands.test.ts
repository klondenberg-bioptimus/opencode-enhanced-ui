import assert from "node:assert/strict"
import { describe, test } from "node:test"

import type { SessionPanelRef } from "../bridge/types"
import { resolveSeedSessionTarget } from "../core/commands"

describe("resolveSeedSessionTarget", () => {
  test("prefers a visible session in the same workspace before the most recent one", () => {
    const visible = {
      workspaceId: "file:///workspace-a",
      dir: "/workspace-a",
      sessionId: "session-visible",
    } satisfies SessionPanelRef

    const recent = {
      workspaceId: "file:///workspace-a",
      dir: "/workspace-a",
      sessionId: "session-recent",
    } satisfies SessionPanelRef

    const target = resolveSeedSessionTarget({
      workspaceId: "file:///workspace-a",
      visibleSession: visible,
      recentSession: recent,
    })

    assert.deepEqual(target, visible)
  })

  test("reuses the most recent open session in the same workspace when no panel is active", () => {
    const recent = {
      workspaceId: "file:///workspace-a",
      dir: "/workspace-a",
      sessionId: "session-1",
    } satisfies SessionPanelRef

    const target = resolveSeedSessionTarget({
      workspaceId: "file:///workspace-a",
      recentSession: recent,
    })

    assert.deepEqual(target, recent)
  })

  test("ignores open sessions from other workspaces", () => {
    const recent = {
      workspaceId: "file:///workspace-b",
      dir: "/workspace-b",
      sessionId: "session-2",
    } satisfies SessionPanelRef

    const target = resolveSeedSessionTarget({
      workspaceId: "file:///workspace-a",
      recentSession: recent,
    })

    assert.equal(target, undefined)
  })
})

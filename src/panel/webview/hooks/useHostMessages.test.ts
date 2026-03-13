import assert from "node:assert/strict"
import { describe, test } from "node:test"
import type { Dispatch, SetStateAction } from "react"

import type { HostMessage } from "../../../bridge/types"
import { dispatchHostMessage } from "./useHostMessages"
import type { AppState } from "../app/state"

describe("dispatchHostMessage", () => {
  test("dispatches shellCommandSucceeded to callback", () => {
    let called = 0
    const fileRefStatus = new Map<string, boolean>()

    dispatchHostMessage({ type: "shellCommandSucceeded" } satisfies HostMessage, {
      fileRefStatus,
      onFileSearchResults: () => {},
      onRestoreComposer: () => {},
      onShellCommandSucceeded: () => {
        called += 1
      },
      setPendingMcpActions: (() => {}) as Dispatch<SetStateAction<Record<string, boolean>>>,
      setState: (() => {}) as Dispatch<SetStateAction<AppState>>,
    })

    assert.equal(called, 1)
  })

  test("dispatches restoreComposer to callback", () => {
    let restored: string | null = null
    const fileRefStatus = new Map<string, boolean>()

    dispatchHostMessage({
      type: "restoreComposer",
      parts: [{ type: "text", text: "echo hi" }],
    } satisfies HostMessage, {
      fileRefStatus,
      onFileSearchResults: () => {},
      onRestoreComposer: (payload) => {
        restored = payload.parts.map((p) => p.type === "text" ? p.text : "").join("")
      },
      onShellCommandSucceeded: () => {},
      setPendingMcpActions: (() => {}) as Dispatch<SetStateAction<Record<string, boolean>>>,
      setState: (() => {}) as Dispatch<SetStateAction<AppState>>,
    })

    assert.equal(restored, "echo hi")
  })
})

import assert from "node:assert/strict"
import { describe, test } from "node:test"
import * as vscode from "vscode"

import { SessionPanelController } from "./controller"
import { SessionPanelManager } from "./index"

describe("SessionPanelController.reveal", () => {
  test("reveals the panel in the requested editor column", async () => {
    const revealed: vscode.ViewColumn[] = []
    const controller = Object.create(SessionPanelController.prototype) as SessionPanelController

    Reflect.set(controller, "push", async () => {})
    Reflect.set(controller, "panel", {
      reveal(viewColumn: vscode.ViewColumn) {
        revealed.push(viewColumn)
      },
    } as unknown as vscode.WebviewPanel)

    await controller.reveal(vscode.ViewColumn.Beside)

    assert.deepEqual(revealed, [vscode.ViewColumn.Beside])
  })
})

describe("SessionPanelManager.open", () => {
  test("reuses an existing panel in the requested editor column", async () => {
    const revealed: vscode.ViewColumn[] = []
    const manager = Object.create(SessionPanelManager.prototype) as SessionPanelManager
    const key = "file:///workspace::session-1"
    const existing = {
      panel: {},
      async reveal(viewColumn?: vscode.ViewColumn) {
        revealed.push(viewColumn ?? vscode.ViewColumn.Active)
      },
    }

    Reflect.set(manager, "panels", new Map([[key, existing]]))

    await manager.open({
      workspaceId: "file:///workspace",
      dir: "/workspace",
      sessionId: "session-1",
    }, vscode.ViewColumn.Beside)

    assert.deepEqual(revealed, [vscode.ViewColumn.Beside])
  })
})

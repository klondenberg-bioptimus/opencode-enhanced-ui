import assert from "node:assert/strict"
import { describe, test } from "node:test"
import * as vscode from "vscode"

import { SessionPanelController } from "./controller"
import { SessionPanelManager } from "./index"

describe("SessionPanelController.reveal", () => {
  test("reveals the panel in its existing editor column by default", async () => {
    const revealed: vscode.ViewColumn[] = []
    const controller = Object.create(SessionPanelController.prototype) as SessionPanelController

    Reflect.set(controller, "push", async () => {})
    Reflect.set(controller, "panel", {
      viewColumn: 5,
      reveal(viewColumn: vscode.ViewColumn) {
        revealed.push(viewColumn)
      },
    } as unknown as vscode.WebviewPanel)

    await controller.reveal()

    assert.deepEqual(revealed, [5])
  })
})

describe("SessionPanelManager.open", () => {
  test("creates new session panels in the existing OpenCode group before splitting again", async () => {
    const created: vscode.ViewColumn[] = []
    const manager = Object.create(SessionPanelManager.prototype) as SessionPanelManager
    const existingKey = "file:///workspace::session-open"

    Reflect.set(manager, "panels", new Map([[existingKey, {
      ref: {
        workspaceId: "file:///workspace",
        dir: "/workspace",
        sessionId: "session-open",
      },
      panel: {
        viewColumn: 4,
      },
    }]]))
    Reflect.set(manager, "createController", (_ref: unknown, viewColumn?: vscode.ViewColumn) => {
      created.push(viewColumn ?? vscode.ViewColumn.Active)
      return {
        panel: {},
        push: async () => {},
      }
    })

    await manager.open({
      workspaceId: "file:///workspace",
      dir: "/workspace",
      sessionId: "session-new",
    }, vscode.ViewColumn.Beside)

    assert.deepEqual(created, [4])
  })
})

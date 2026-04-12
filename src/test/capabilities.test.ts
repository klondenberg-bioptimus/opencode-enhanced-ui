import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { CapabilityStore, classifyCapabilityError, createEmptyCapabilities } from "../core/capabilities"

describe("capabilities", () => {
  test("starts with unknown feature support", () => {
    const snapshot = createEmptyCapabilities()
    assert.equal(snapshot.sessionSearch, "unknown")
    assert.equal(snapshot.sessionChildren, "unknown")
  })

  test("treats not implemented style errors as unsupported", () => {
    assert.equal(classifyCapabilityError(new Error("404 not found")), "unsupported")
  })

  test("treats transient failures as unknown", () => {
    assert.equal(classifyCapabilityError(new Error("socket hang up")), "unknown")
  })

  test("reuses cached capability snapshots until refresh", async () => {
    let calls = 0
    const manager = new CapabilityStore({
      probe: async () => {
        calls += 1
        return { ...createEmptyCapabilities(), sessionSearch: "supported" }
      },
    })

    const first = await manager.getOrProbe("ws-1")
    const second = await manager.getOrProbe("ws-1")

    assert.equal(first.sessionSearch, "supported")
    assert.equal(second.sessionSearch, "supported")
    assert.equal(calls, 1)
  })
})

import assert from "node:assert/strict"
import { describe, test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { MarkdownBlock } from "./MarkdownBlock"

describe("MarkdownBlock file links", () => {
  test("keeps file references inside the webview instead of opening a browser tab", () => {
    const html = renderToStaticMarkup(
      <MarkdownBlock
        fileRefStatus={new Map()}
        onOpenFile={() => {}}
        onResolveFileRefs={() => {}}
        content="[AGENTS.md](AGENTS.md) [OpenCode](https://example.com)"
      />,
    )

    assert.doesNotMatch(html, /href="AGENTS\.md"[^>]*target="_blank"/)
    assert.match(html, /href="https:\/\/example\.com"[^>]*target="_blank"/)
  })

  test("does not treat auto-linkified bare markdown filenames as external browser links", () => {
    const html = renderToStaticMarkup(
      <MarkdownBlock
        fileRefStatus={new Map()}
        onOpenFile={() => {}}
        onResolveFileRefs={() => {}}
        content="README.md"
      />,
    )

    assert.doesNotMatch(html, /href="http:\/\/README\.md"[^>]*target="_blank"/)
  })
})

import assert from "node:assert/strict"
import { describe, test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { PermissionRequest, QuestionRequest } from "../../../core/sdk"
import { PermissionDock, QuestionBlock } from "./docks"

function questionRequest(): Pick<QuestionRequest, "id" | "questions"> {
  return {
    id: "question-1",
    questions: [
      {
        header: "Target audience",
        question: "Who is the primary audience for this article?",
        options: [
          {
            label: "Programmers/developers",
            description: "Technical audience familiar with coding",
          },
          {
            label: "Business/management",
            description: "Decision-makers evaluating AI tools",
          },
        ],
      },
      {
        header: "Article tone",
        question: "What tone would you like for the article?",
        options: [
          {
            label: "Conversational/accessible",
            description: "Friendly and easy to understand",
          },
          {
            label: "Critical/balanced",
            description: "Examining both benefits and concerns",
          },
        ],
      },
    ],
  }
}

describe("QuestionBlock", () => {
  test("collapses answered questions to selected answers by default", () => {
    const html = renderToStaticMarkup(
      <QuestionBlock
        request={questionRequest()}
        mode="answered"
        answers={[
          ["Programmers/developers"],
          ["Conversational/accessible"],
        ]}
      />,
    )
    const showOptionsIndex = html.indexOf("Show options")
    const selectedDescriptionIndex = html.indexOf("Technical audience familiar with coding")

    assert.equal(html.includes("Programmers/developers"), true)
    assert.equal(html.includes("Conversational/accessible"), true)
    assert.equal(html.includes("Technical audience familiar with coding"), true)
    assert.equal(html.includes("Business/management"), false)
    assert.equal(html.includes("Critical/balanced"), false)
    assert.equal(html.includes("Selected answer"), false)
    assert.equal(html.includes("Show options"), true)
    assert.equal(showOptionsIndex > -1, true)
    assert.equal(selectedDescriptionIndex > -1, true)
    assert.equal(showOptionsIndex < selectedDescriptionIndex, true)
  })

  test("keeps unanswered questions expanded", () => {
    const html = renderToStaticMarkup(
      <QuestionBlock
        request={questionRequest()}
        mode="answered"
        answers={[
          [],
          ["Conversational/accessible"],
        ]}
      />,
    )

    assert.equal(html.includes("Business/management"), true)
    assert.equal(html.includes("No answer recorded."), true)
  })
})

function permissionRequest(permission: PermissionRequest["permission"], extras?: Partial<PermissionRequest>): PermissionRequest {
  return {
    id: `permission-${permission}`,
    sessionID: "session-1",
    permission,
    patterns: [],
    metadata: {},
    always: [],
    ...extras,
  }
}

describe("PermissionDock", () => {
  const FileRefText = ({ value, display }: { value: string; display?: string }) => <span className="test-file-ref" data-path={value}>{display || value}</span>

  test("renders clickable file refs for edit permission titles and path details", () => {
    const html = renderToStaticMarkup(
      <PermissionDock
        request={permissionRequest("edit", {
          metadata: {
            filepath: "src/panel/webview/app/App.tsx",
          },
        })}
        currentSessionID="session-1"
        rejectMessage=""
        onRejectMessage={() => {}}
        onReply={() => {}}
        FileRefText={FileRefText}
      />,
    )

    assert.equal(html.includes('class="test-file-ref" data-path="src/panel/webview/app/App.tsx"'), true)
    assert.equal(html.includes("Path:"), true)
  })

  test("renders clickable file refs for read and list permission paths", () => {
    const readHtml = renderToStaticMarkup(
      <PermissionDock
        request={permissionRequest("read", {
          metadata: {
            filePath: "src/panel/provider/files.ts",
          },
        })}
        currentSessionID="session-1"
        rejectMessage=""
        onRejectMessage={() => {}}
        onReply={() => {}}
        FileRefText={FileRefText}
      />,
    )
    const listHtml = renderToStaticMarkup(
      <PermissionDock
        request={permissionRequest("list", {
          metadata: {
            path: "src/panel/webview",
          },
        })}
        currentSessionID="session-1"
        rejectMessage=""
        onRejectMessage={() => {}}
        onReply={() => {}}
        FileRefText={FileRefText}
      />,
    )

    assert.equal(readHtml.includes('data-path="src/panel/provider/files.ts"'), true)
    assert.equal(listHtml.includes('data-path="src/panel/webview"'), true)
  })
})

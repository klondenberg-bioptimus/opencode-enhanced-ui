import assert from "node:assert/strict"
import { describe, test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { SkillCatalogEntry } from "../../../bridge/types"
import type { FilePart, MessageInfo, MessagePart, SessionMessage, TextPart } from "../../../core/sdk"
import { Timeline } from "./timeline"

function messageInfo(id: string, role: "user" | "assistant", extras?: Partial<MessageInfo>): MessageInfo {
  return {
    id,
    sessionID: "session-1",
    role,
    time: {
      created: 0,
      completed: role === "assistant" ? 1 : undefined,
    },
    ...extras,
  }
}

function textPart(id: string, messageID: string, text: string): TextPart {
  return {
    id,
    sessionID: "session-1",
    messageID,
    type: "text",
    text,
  }
}

function sessionMessage(info: MessageInfo, parts: MessagePart[]): SessionMessage {
  return { info, parts }
}

const WRAPPED_SKILL_OUTPUT = `<skill_content name="using-superpowers">
# Skill: using-superpowers

# Using Skills

Always check the skill list first.

</skill_content>`

const ARTICLE_WRITING_SKILL: SkillCatalogEntry[] = [{
  name: "article-writing",
  content: `# Article Writing

Write long-form content that sounds like a real person or brand, not generic AI output.

## When to Activate

- drafting blog posts, essays, launch posts, guides, tutorials, or newsletter issues
`,
  location: "/Users/lantingxin/.codex/skills/article-writing/SKILL.md",
}]

function filePart(id: string, messageID: string, extras?: Partial<FilePart>): FilePart {
  return {
    id,
    sessionID: "session-1",
    messageID,
    type: "file",
    mime: "text/plain",
    filename: "notes.txt",
    url: "file:///workspace/notes.txt",
    ...extras,
  }
}

describe("Timeline user message rendering", () => {
  test("does not render a dedicated You header for user messages", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [textPart("p1", "m1", "hello")])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={[]}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes("You"), false)
    assert.equal(html.includes("oc-entryHeader"), false)
  })

  test("renders a message action bar for user messages", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [textPart("p1", "m1", "hello")])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={[]}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes("oc-messageActions"), true)
    assert.equal(html.includes('aria-label="Copy"'), true)
    assert.equal(html.includes('aria-label="Fork"'), true)
    assert.equal(html.includes('aria-label="Undo"'), true)
    assert.equal(html.includes('data-tooltip="Copy"'), true)
    assert.equal(html.includes('data-tooltip="Fork"'), true)
    assert.equal(html.includes('data-tooltip="Undo"'), true)
    assert.equal(html.includes(">Copy<"), false)
  })

  test("renders a redo action for revert notices", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[
          sessionMessage(messageInfo("m1", "user"), [textPart("p1", "m1", "hello")]),
          sessionMessage(messageInfo("m2", "assistant"), [textPart("p2", "m2", "done")]),
        ]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onUndoUserMessage={() => {}}
        onRedoSession={() => {}}
        revertID="m1"
        showInternals={false}
        showThinking={true}
        skillCatalog={[]}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes('aria-label="Redo"'), true)
    assert.equal(html.includes('data-tooltip="Redo"'), true)
  })

  test("renders a compact skill marker for wrapped user text", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [textPart("p1", "m1", `${WRAPPED_SKILL_OUTPUT}\n继续执行`)])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={[]}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes("SKILL"), true)
    assert.equal(html.includes("using-superpowers"), true)
    assert.equal(html.includes("继续执行"), true)
    assert.equal(html.includes("Always check the skill list first."), false)
  })

  test("renders a compact skill marker for exact matched skill content", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [textPart("p1", "m1", ARTICLE_WRITING_SKILL[0]!.content)])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={ARTICLE_WRITING_SKILL}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes("SKILL"), true)
    assert.equal(html.includes("article-writing"), true)
    assert.equal(html.includes("Write long-form content"), false)
  })

  test("renders clickable skill and file attachments ahead of the prompt text", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [
          textPart("p1", "m1", `${ARTICLE_WRITING_SKILL[0]!.content}\n继续执行`),
          filePart("f1", "m1"),
        ])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={ARTICLE_WRITING_SKILL}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes('aria-label="Open skill article-writing"'), true)
    assert.equal(html.includes('aria-label="Open attachment notes.txt"'), true)
    assert.ok(html.indexOf("article-writing") < html.indexOf("继续执行"))
    assert.ok(html.indexOf("notes.txt") < html.indexOf("继续执行"))
  })

  test("renders image attachments with a preview action", () => {
    const html = renderToStaticMarkup(
      <Timeline
        bootstrapStatus="ready"
        compactSkillInvocations={true}
        diffMode="unified"
        messages={[sessionMessage(messageInfo("m1", "user"), [
          textPart("p1", "m1", "这个图片看看"),
          filePart("f1", "m1", {
            mime: "image/png",
            filename: "image.png",
            url: "data:image/png;base64,abc123",
          }),
        ])]}
        onCopyUserMessage={() => {}}
        onForkUserMessage={() => {}}
        onOpenFileAttachment={() => {}}
        onPreviewImageAttachment={() => {}}
        onRedoSession={() => {}}
        onUndoUserMessage={() => {}}
        showInternals={false}
        showThinking={true}
        skillCatalog={[]}
        AgentBadge={({ name }) => <span>{name}</span>}
        CompactionDivider={() => <div>divider</div>}
        EmptyState={({ title, text }) => <div>{title}:{text}</div>}
        MarkdownBlock={({ content, className }) => <div className={className}>{content}</div>}
        PartView={({ part }) => <div>{part.type}</div>}
      />,
    )

    assert.equal(html.includes('aria-label="Preview image.png"'), true)
  })
})

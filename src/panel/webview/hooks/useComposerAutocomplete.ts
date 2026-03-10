import React from "react"

export type ComposerAutocompleteTrigger = "slash" | "mention"

export type ComposerAutocompleteItem = {
  id: string
  label: string
  detail: string
  keywords?: string[]
  trigger: ComposerAutocompleteTrigger
  kind: "action" | "agent"
}

export type ComposerAutocompleteState = {
  trigger: ComposerAutocompleteTrigger
  query: string
  items: ComposerAutocompleteItem[]
  selectedIndex: number
}

type ComposerAutocompleteMatch = {
  trigger: ComposerAutocompleteTrigger
  query: string
}

export function useComposerAutocomplete(sources: ComposerAutocompleteItem[]) {
  const [state, setState] = React.useState<ComposerAutocompleteState | null>(null)

  const sync = React.useCallback((value: string, cursor: number | null | undefined) => {
    const next = matchAutocomplete(value, cursor)
    if (!next) {
      setState(null)
      return
    }

    setState((current) => {
      const items = filterItems(sources, next.trigger, next.query)
      const selectedIndex = items.length === 0
        ? 0
        : current && current.trigger === next.trigger && current.query === next.query
          ? Math.min(current.selectedIndex, items.length - 1)
          : 0

      return {
        trigger: next.trigger,
        query: next.query,
        items,
        selectedIndex,
      }
    })
  }, [sources])

  const close = React.useCallback(() => {
    setState(null)
  }, [])

  const move = React.useCallback((delta: number) => {
    setState((current) => {
      if (!current || current.items.length === 0) {
        return current
      }

      const size = current.items.length
      const nextIndex = (current.selectedIndex + delta + size) % size
      return {
        ...current,
        selectedIndex: nextIndex,
      }
    })
  }, [])

  const currentItem = state?.items[state.selectedIndex]

  return {
    state,
    currentItem,
    sync,
    close,
    move,
  }
}

function matchAutocomplete(value: string, cursor: number | null | undefined): ComposerAutocompleteMatch | null {
  if (typeof cursor !== "number") {
    return null
  }

  const slash = matchSlash(value, cursor)
  if (slash) {
    return slash
  }

  return matchMention(value, cursor)
}

function matchSlash(value: string, cursor: number): ComposerAutocompleteMatch | null {
  if (cursor < 1 || value[0] !== "/") {
    return null
  }

  const token = value.slice(0, cursor)
  if (/\s/.test(token)) {
    return null
  }

  return {
    trigger: "slash",
    query: value.slice(1, cursor),
  }
}

function matchMention(value: string, cursor: number): ComposerAutocompleteMatch | null {
  if (cursor < 1) {
    return null
  }

  let index = cursor - 1
  while (index >= 0) {
    const char = value[index]
    if (char === "@") {
      const prev = index === 0 ? "" : value[index - 1]
      if (prev && !/\s/.test(prev)) {
        return null
      }
      return {
        trigger: "mention",
        query: value.slice(index + 1, cursor),
      }
    }
    if (/\s/.test(char)) {
      return null
    }
    index -= 1
  }

  return null
}

function filterItems(items: ComposerAutocompleteItem[], trigger: ComposerAutocompleteTrigger, query: string) {
  const source = items.filter((item) => item.trigger === trigger)
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return source
  }

  return source.filter((item) => {
    const haystack = [item.label, item.detail, ...(item.keywords ?? [])].join(" ").toLowerCase()
    return haystack.includes(normalized)
  })
}

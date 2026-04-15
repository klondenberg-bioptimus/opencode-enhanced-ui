type ComposerPrimaryActionInput = {
  draft: string
  imageCount: number
  blocked: boolean
  running: boolean
  escPending: boolean
}

type ComposerPrimaryActionState = {
  kind: "submit" | "interrupt"
  disabled: boolean
  icon: "send" | "stop" | "stop-confirm"
  title: string
  ariaLabel: string
}

export function composerPrimaryAction(input: ComposerPrimaryActionInput): ComposerPrimaryActionState {
  if (input.running) {
    if (input.escPending) {
      return {
        kind: "interrupt",
        disabled: false,
        icon: "stop-confirm",
        title: "Press again to interrupt",
        ariaLabel: "Interrupt running session now",
      }
    }

    return {
      kind: "interrupt",
      disabled: false,
      icon: "stop",
      title: "Interrupt running session",
      ariaLabel: "Interrupt running session",
    }
  }

  if (input.blocked) {
    return {
      kind: "submit",
      disabled: true,
      icon: "send",
      title: "Submit unavailable",
      ariaLabel: "Submit prompt",
    }
  }

  const hasContent = !!input.draft.trim() || input.imageCount > 0
  return {
    kind: "submit",
    disabled: !hasContent,
    icon: "send",
    title: "Enter to submit",
    ariaLabel: "Submit prompt",
  }
}

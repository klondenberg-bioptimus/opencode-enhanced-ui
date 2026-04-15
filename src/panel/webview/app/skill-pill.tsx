import React from "react"

export function SkillPill({ name }: { name: string }) {
  return (
    <span className="oc-pill oc-pill-file oc-pill-skill">
      <span className="oc-pillFileType">SKILL</span>
      <span className="oc-pillFilePath">{name}</span>
    </span>
  )
}

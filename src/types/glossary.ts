export interface GlossaryTerm {
  term: string
  definition: string
}

export interface GlossaryGroup {
  groupName: string | null
  group: GlossaryTerm[]
}

export interface Glossary {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  groups: GlossaryGroup[]
}

export interface GlossaryMeta {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  termCount: number
}

export interface GlossaryTerm {
  term: string
  definition: string
}

export interface Glossary {
  id: string
  name: string
  description: string
  category: string
  color: string
  icon: string
  terms: GlossaryTerm[]
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

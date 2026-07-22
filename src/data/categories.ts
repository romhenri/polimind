export interface Category {
  id: string
  label: string
  subcategories: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'computer_science',
    label: 'Ciência da Computação',
    subcategories: [
      'IA e Machine Learning',
      'Algoritmos e Estruturas de dados',
      'Linguagens de programação',
      'Bancos de dados',
      'Hardware',
      'Redes',
    ],
  },
  {
    id: 'mathematics',
    label: 'Matemática',
    subcategories: [
      'Estatística e Probabilidade',
      'Álgebra e Cálculo',
      'Geometria',
      'Matemática discreta',
    ],
  },
  {
    id: 'sciences',
    label: 'Ciências',
    subcategories: ['Física', 'Química', 'Biologia', 'Paleontologia', 'Astronomia'],
  },
  {
    id: 'history',
    label: 'História',
    subcategories: [
      'História antiga',
      'História moderna',
      'Guerras e conflitos',
      'Filosofia',
      'Mitologia',
    ],
  },
  {
    id: 'general',
    label: 'Geral',
    subcategories: [],
  },
]

export function getCategoryById(id?: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function getCategoryLabel(id?: string): string {
  return getCategoryById(id)?.label ?? id ?? ''
}

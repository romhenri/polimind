export interface Category {
  id: string
  label: string
  subcategories: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: 'computer_science',
    label: 'Computer Science',
    subcategories: [
      'AI & Machine Learning',
      'Algorithms & Data Structures',
      'Programming Languages',
      'Databases',
      'Hardware',
      'Networks',
    ],
  },
  {
    id: 'mathematics',
    label: 'Mathematics',
    subcategories: [
      'Statistics & Probability',
      'Algebra & Calculus',
      'Geometry',
      'Discrete Mathematics',
    ],
  },
  {
    id: 'sciences',
    label: 'Sciences',
    subcategories: ['Physics', 'Chemistry', 'Biology', 'Paleontology', 'Astronomy'],
  },
  {
    id: 'history',
    label: 'History',
    subcategories: [
      'Ancient History',
      'Modern History',
      'Wars & Conflicts',
      'Philosophy',
      'Mythology',
    ],
  },
  {
    id: 'general',
    label: 'General',
    subcategories: [],
  },
]

export function getCategoryById(id?: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function getCategoryLabel(id?: string): string {
  return getCategoryById(id)?.label ?? id ?? ''
}

import type { IconType } from 'react-icons'
import { FaNetworkWired, FaEarthAmericas, FaGlobe, FaGears, FaDna, FaLayerGroup, FaChartColumn } from 'react-icons/fa6'
import { FaFistRaised } from 'react-icons/fa'
import { TbBinaryTree, TbMath, TbBrain } from 'react-icons/tb'
import { GiDinosaurRex, GiGreekTemple } from 'react-icons/gi'

export interface Trail {
  id: string
  name: string
  description: string
  category: string
  icon: IconType
  color: string
  quizzes: string[]
}

export const TRAILS: Trail[] = [
  {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Recurrence, complexity, sorting, graphs and greedy strategies.',
    category: 'Computing',
    icon: TbBinaryTree,
    color: 'teal',
    quizzes: [
      'algorithmic-recurrence',
      'analysis-of-algorithms',
      'asymptotic-analysis',
      'dijkstra-algorithm',
      'greedy-algorithms',
      'minimum-spanning-tree',
      'sorting-algorithms',
      'sorting-algorithms2',
      'sorting-algorithms3',
    ],
  },
  {
    id: 'data-structures',
    name: 'Data Structures',
    description: 'Lists, stacks, queues, linked lists and deques — the building blocks of code.',
    category: 'Computing',
    icon: FaLayerGroup,
    color: 'emerald',
    quizzes: ['data-structures-list', 'data-structures-list-2'],
  },
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    description: 'Fundamentals, models and the metrics that measure how well they learn.',
    category: 'Data',
    icon: TbBrain,
    color: 'lime',
    quizzes: ['ml-fundamentals', 'ml-fundamentals-2', 'ml-evaluation-metrics'],
  },
  {
    id: 'networks',
    name: 'Networks',
    description: 'Protocols, IP, transport and the layers that move your data.',
    category: 'Computing',
    icon: FaNetworkWired,
    color: 'blue',
    quizzes: [
      'computer-networks',
      'computer-networks2',
      'computer-networks3',
      'dhcp-protocol',
      'ip-addresses',
      'nat-networks',
      'network-layer',
      'quic',
      'reliable-data-transfer',
      'router-data-plane',
      'tcp',
      'transport-layer',
      'udp',
    ],
  },
  {
    id: 'general',
    name: 'General',
    description: 'Mixed culture, history and trivia to keep you sharp.',
    category: 'General',
    icon: FaEarthAmericas,
    color: 'amber',
    quizzes: ['general1', 'general2', 'general3', 'general4'],
  },
  {
    id: 'greece',
    name: 'Greece',
    description: 'Ancient Greek culture, society and the gods, heroes and monsters of its mythology.',
    category: 'History',
    icon: GiGreekTemple,
    color: 'blue',
    quizzes: [
      'ancient-greece',
      'greek-mythology',
      'greek-mythology-2',
      'greek-mythology-3',
    ],
  },
  {
    id: 'revolutions',
    name: 'Revolutions',
    description: 'The upheavals that reshaped society — from industry to the streets.',
    category: 'History',
    icon: FaFistRaised,
    color: 'red',
    quizzes: ['french-revolution', 'industrial-revolution'],
  },
  {
    id: 'web-dev',
    name: 'Web Dev',
    description: 'JavaScript, TypeScript, React, Next.js and the web platform.',
    category: 'Programming',
    icon: FaGlobe,
    color: 'violet',
    quizzes: [
      'javascript',
      'javascript2',
      'javascript3',
      'typescript',
      'typescript2',
      'react',
      'react2',
      'nextjs',
      'css',
      'web1',
      'web2',
      'web3',
      'python',
    ],
  },
  {
    id: 'devops',
    name: 'DevOps',
    description: 'Version control, containers and the command line that ship software.',
    category: 'Programming',
    icon: FaGears,
    color: 'indigo',
    quizzes: ['git', 'git2', 'docker', 'terminal-linux', 'terminal-windows'],
  },
  {
    id: 'math',
    name: 'Math',
    description: 'Powers, fractions, algebra, derivatives and integrals.',
    category: 'Math',
    icon: TbMath,
    color: 'orange',
    quizzes: [
      'power-rules',
      'fraction-rules',
      'algebraic-processing',
      'calculus-derivatives',
      'calculus-integrals',
    ],
  },
  {
    id: 'statistics-probability',
    name: 'Statistics & Probability',
    description: 'Distributions, conditional probability, Bayes and the math of uncertainty.',
    category: 'Math',
    icon: FaChartColumn,
    color: 'amber',
    quizzes: ['statistics', 'probability-theory'],
  },
  {
    id: 'biology',
    name: 'Biology',
    description: 'Cells, the human body and the ecosystems that connect all life.',
    category: 'Science',
    icon: FaDna,
    color: 'emerald',
    quizzes: ['cytology', 'ecology', 'human-physiology'],
  },
  {
    id: 'dinosaur',
    name: 'Dinosaur',
    description: 'Paleontology and the giants that once ruled the Earth.',
    category: 'Science',
    icon: GiDinosaurRex,
    color: 'green',
    quizzes: ['dinosaurs', 'dinosaurs2', 'dinosaurs3'],
  },
]

export function getTrail(id: string): Trail | undefined {
  return TRAILS.find((trail) => trail.id === id)
}

import type { IconType } from 'react-icons'
import {
  FaBrain,
  FaNetworkWired,
  FaDna,
  FaBookOpen,
  FaFlask,
  FaMicrochip,
  FaCode,
} from 'react-icons/fa6'
import { TbBinaryTree, TbMath } from 'react-icons/tb'
import { GiDinosaurRex } from 'react-icons/gi'

const ICON_BY_ID: Record<string, IconType> = {
  'machine-learning': FaBrain,
  algorithms: TbBinaryTree,
  networks: FaNetworkWired,
  biology: FaDna,
  dinosaurs: GiDinosaurRex,
}

const ICON_BY_CATEGORY: Record<string, IconType> = {
  Computing: FaMicrochip,
  Programming: FaCode,
  Math: TbMath,
  Science: FaFlask,
}

export function getGlossaryIcon(id: string, category?: string): IconType {
  return ICON_BY_ID[id] ?? (category ? ICON_BY_CATEGORY[category] : undefined) ?? FaBookOpen
}

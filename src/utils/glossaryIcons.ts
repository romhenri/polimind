import type { IconType } from 'react-icons'
import {
  FaBrain,
  FaNetworkWired,
  FaDna,
  FaBookOpen,
  FaFlask,
  FaMicrochip,
  FaChartLine,
  FaLayerGroup,
  FaEye,
} from 'react-icons/fa6'
import { TbBinaryTree, TbMath } from 'react-icons/tb'
import { GiDinosaurRex, GiGreekTemple } from 'react-icons/gi'

const ICON_BY_ID: Record<string, IconType> = {
  'machine-learning': FaBrain,
  'ml-metrics': FaChartLine,
  algorithms: TbBinaryTree,
  'data-structures-list': FaLayerGroup,
  networks: FaNetworkWired,
  biology: FaDna,
  dinosaurs: GiDinosaurRex,
  'greek-mythology': GiGreekTemple,
  'attention-mechanisms': FaEye,
}

const ICON_BY_CATEGORY: Record<string, IconType> = {
  computer_science: FaMicrochip,
  mathematics: TbMath,
  sciences: FaFlask,
}

export function getGlossaryIcon(id: string, category?: string): IconType {
  return ICON_BY_ID[id] ?? (category ? ICON_BY_CATEGORY[category] : undefined) ?? FaBookOpen
}

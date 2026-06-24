import type { IconType } from 'react-icons'
import { FaGraduationCap, FaBrain } from 'react-icons/fa6'
import { GiWizardFace } from 'react-icons/gi'
import type { AvatarOption } from '@/contexts/ProfileContext'

export const AVATAR_OPTIONS: { id: AvatarOption; name: string; desc: string; Icon: IconType }[] = [
  { id: 'sage', name: 'Sage', desc: 'Master of deep knowledge', Icon: GiWizardFace },
  { id: 'scholar', name: 'Scholar', desc: 'Academic master', Icon: FaGraduationCap },
  { id: 'thinker', name: 'Thinker', desc: 'Analytical mind', Icon: FaBrain },
]

export const AVATAR_ICONS: Record<AvatarOption, IconType> = {
  sage: GiWizardFace,
  scholar: FaGraduationCap,
  thinker: FaBrain,
}

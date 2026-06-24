import type { IconType } from 'react-icons'
import {
  FaUser,
  FaUserGraduate,
  FaUserTie,
  FaUserNinja,
  FaUserAstronaut,
  FaUserSecret,
} from 'react-icons/fa6'
import type { AvatarOption } from '@/contexts/ProfileContext'

export const AVATAR_OPTIONS: { id: AvatarOption; name: string; desc: string; Icon: IconType }[] = [
  { id: 'user', name: 'Classic', desc: 'Simple and timeless', Icon: FaUser },
  { id: 'graduate', name: 'Graduate', desc: 'Academic master', Icon: FaUserGraduate },
  { id: 'tie', name: 'Executive', desc: 'Polished professional', Icon: FaUserTie },
  { id: 'ninja', name: 'Ninja', desc: 'Swift and focused', Icon: FaUserNinja },
  { id: 'astronaut', name: 'Astronaut', desc: 'Explorer of ideas', Icon: FaUserAstronaut },
  { id: 'secret', name: 'Agent', desc: 'Master of mystery', Icon: FaUserSecret },
]

export const AVATAR_ICONS: Record<AvatarOption, IconType> = {
  user: FaUser,
  graduate: FaUserGraduate,
  tie: FaUserTie,
  ninja: FaUserNinja,
  astronaut: FaUserAstronaut,
  secret: FaUserSecret,
}

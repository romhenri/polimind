export const AVAILABLE_COLORS: Record<string, string> = {
  orange: '#cc785c',
  red: '#b04a3a',
  amber: '#b07636',
  yellow: '#aa8a36',
  lime: '#8a8a44',
  green: '#6f7c46',
  emerald: '#586b4e',
  teal: '#477064',
  cyan: '#4f7b7d',
  sky: '#5e7e92',
  blue: '#50688a',
  indigo: '#545680',
  violet: '#65527c',
  purple: '#74506a',
  pink: '#a85f6c',
  gray: '#7d7165',
}

const FALLBACK_COLOR = '#7d7165'

export function getColor(colorName: string): string {
  return AVAILABLE_COLORS[colorName] ?? FALLBACK_COLOR
}

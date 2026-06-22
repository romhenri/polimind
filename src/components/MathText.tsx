'use client'

import { renderMathTextToHtml } from '@/lib/mathText'

type MathTextProps = {
  children: string
  className?: string
  as?: 'span' | 'div'
  mathEnabled?: boolean
}

/**
 * Renderiza texto misto (ex.: português + fórmulas) com KaTeX para potências e expressões.
 */
export default function MathText({
  children,
  className,
  as: Tag = 'span',
  mathEnabled = false,
}: MathTextProps) {
  if (!mathEnabled) {
    return <Tag className={className}>{children}</Tag>
  }
  return (
    <Tag
      className={`math-text ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: renderMathTextToHtml(children) }}
    />
  )
}

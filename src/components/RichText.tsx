import { Fragment } from 'react'

interface RichTextProps {
  children: string
  className?: string
}

export default function RichText({ children, className }: RichTextProps) {
  const parts = children.split(/(\*\*[^*]+\*\*)/g)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const match = part.match(/^\*\*([^*]+)\*\*$/)
        if (match) {
          return (
            <strong
              key={index}
              className="font-semibold underline quiz-accent decoration-2 underline-offset-2"
            >
              {match[1]}
            </strong>
          )
        }
        return <Fragment key={index}>{part}</Fragment>
      })}
    </span>
  )
}

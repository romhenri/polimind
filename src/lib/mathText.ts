import katex from 'katex'

/** Converte notação comum dos JSONs (sin, cos, ln) para comandos LaTeX. */
export function asciiMathToLatex(s: string): string {
  return s
    .replace(/\bsin\(/g, '\\sin(')
    .replace(/\bcos\(/g, '\\cos(')
    .replace(/\btan\(/g, '\\tan(')
    .replace(/\bln\(/g, '\\ln(')
    .replace(/\blog\(/g, '\\log(')
    .replace(/>=/g, '\\geq')
    .replace(/<=/g, '\\leq')
}

/**
 * Palavras com hífen só entre letras (aplica-se, retro-substituição).
 * Não é subtração — não deve ir para KaTeX.
 */
function isLetterHyphenCompoundWord(s: string): boolean {
  if (!/-/.test(s)) return false
  if (/[0-9]/.test(s)) return false
  if (/[=^()[\]{}*+\\/]/.test(s)) return false
  return /^(\p{L}+(?:-\p{L}+)*)$/u.test(s)
}

const QUOTE_CHARS = "['\u2018\u2019]"

/** Aspas em citação ('palavra, palavra'), não primo de derivada. */
function isQuotedProseToken(core: string): boolean {
  if (new RegExp(`^${QUOTE_CHARS}\\p{L}`, 'u').test(core)) return true
  if (new RegExp(`^\\p{L}{4,}${QUOTE_CHARS}$`, 'u').test(core)) return true
  return false
}

/** Primo de derivada: f'(x), s''(t), ou token só f' / x''. */
function hasDerivativePrimeNotation(core: string): boolean {
  if (/\w['\u2018\u2019]+\(/.test(core)) return true
  if (/^[a-zA-Z]{1,3}['\u2018\u2019]{1,2}$/.test(core)) return true
  return false
}

/**
 * Parênteses só com texto (glossário, ex.: (call), (*call*)); não (x), (n), T(n).
 */
function isParentheticalPlainText(core: string): boolean {
  const m =
    core.match(/^\(([\p{L}\s-]+)\)$/u) ??
    core.match(/^\*\(([\p{L}\s-]+)\)\*$/u)
  if (!m) return false
  const inner = m[1].trim()
  if (inner.length === 0) return false
  if (/\d/.test(inner)) return false
  if (/[=^[\]{}*/\\]/.test(inner)) return false
  if (inner.includes(' ')) return true
  return /^[\p{L}-]+$/u.test(inner) && inner.length >= 4
}

/**
 * Heurística: só passa por KaTeX tokens que parecem expressão matemática,
 * para não tratar palavras em português como fórmulas.
 */
export function shouldRenderAsMath(token: string): boolean {
  const core = token.replace(/[.,;:!?]+$/g, '')
  if (isLetterHyphenCompoundWord(core)) return false
  if (isQuotedProseToken(core)) return false
  if (isParentheticalPlainText(core)) return false
  if (/[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(core)) return false
  if (/^[a-zA-Z]{4,}$/.test(core)) return false
  if (/[\^=_\\]/.test(core)) return true
  if (hasDerivativePrimeNotation(core)) return true
  if (/[(){}\[\]]/.test(core)) return true
  if (/=/.test(core)) return true
  if (/[0-9]/.test(core)) return true
  if (/[+*]/.test(core)) return true
  if (/\//.test(core)) return true
  if (/-/.test(core)) return true
  return false
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Uma letra isolada (variável), após pontuação final opcional. */
function isSingleLatinLetterToken(token: string): boolean {
  const core = token.replace(/[.,;:!?]+$/g, '')
  return /^[a-zA-Z]$/.test(core)
}

/**
 * Último token matemático "pede" variável em seguida (ex.: após +, −, =, abre parêntese).
 * Não vale após ")" para não estilizar o "a" em "f(x) a função".
 */
function shouldContinueSingleLetterMath(lastMathToken: string | null): boolean {
  if (lastMathToken == null) return false
  const core = lastMathToken.replace(/[.,;:!?]+$/g, '')
  if (/^[+*/^=]$/.test(core)) return true
  if (core === '-' || core === '(' || core === '[') return true
  return /[+\-*/=^(\[,]$/.test(core)
}

function findNextNonSpaceIndex(parts: string[], startIdx: number): number {
  for (let j = startIdx; j < parts.length; j++) {
    if (!/^\s+$/.test(parts[j])) return j
  }
  return -1
}

/**
 * Letra isolada antes de contexto claramente matemático (ex.: x + n, x = 1, f( ).
 * Evita "a" em "a casa"; para "a - x" usa-se o próximo token após o menos.
 */
/** Uma letra latina ou um dígito (1 caractere), pontuação final opcional. */
function isSingleLatinLetterOrDigitToken(token: string): boolean {
  const core = token.replace(/[.,;:!?]+$/g, '')
  if (/[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(core)) return false
  return /^[a-zA-Z0-9]$/.test(core)
}

function isInequalityOpToken(token: string): boolean {
  const core = token.replace(/[.,;:!?]+$/g, '')
  return core === '<' || core === '>' || core === '<=' || core === '>='
}

/**
 * Desigualdade curta: um caractere, operador de desigualdade, um caractere
 * (ex.: c > 0, x < y, a >= 0, n <= 1). Os três tokens são matemática.
 */
function inequalityTripleFirst(
  part: string,
  nextPart: string | null,
  nextNextPart: string | null
): boolean {
  if (!isSingleLatinLetterOrDigitToken(part)) return false
  if (nextPart == null || !isInequalityOpToken(nextPart)) return false
  if (nextNextPart == null || !isSingleLatinLetterOrDigitToken(nextNextPart)) return false
  return true
}

function inequalityTripleMiddle(
  lastMathToken: string | null,
  part: string,
  nextPart: string | null
): boolean {
  if (lastMathToken == null || !isSingleLatinLetterOrDigitToken(lastMathToken)) return false
  if (!isInequalityOpToken(part)) return false
  if (nextPart == null || !isSingleLatinLetterOrDigitToken(nextPart)) return false
  return true
}

function inequalityTripleLast(lastMathToken: string | null, part: string): boolean {
  if (lastMathToken == null || !isInequalityOpToken(lastMathToken)) return false
  return isSingleLatinLetterOrDigitToken(part)
}

function singleLetterLeadingMathVariable(
  part: string,
  nextPart: string | null,
  nextNextPart: string | null
): boolean {
  if (!isSingleLatinLetterToken(part)) return false
  const core = part.replace(/[.,;:!?]+$/g, '')
  if (/[áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ]/.test(core)) return false
  if (nextPart == null) return false
  if (nextPart === '=' || nextPart === '(' || nextPart === '[') return true
  if (/^[+*/%]/.test(nextPart)) return true
  if (nextPart.startsWith('(')) return true
  if (nextPart === '-') {
    if (nextNextPart == null) return false
    return /^[0-9(]/.test(nextNextPart)
  }
  return false
}

function tryRenderKatexPart(part: string): { ok: true; html: string } | { ok: false } {
  const trailingMatch = part.match(/^(.+?)([.,;:!?]*)$/)
  const core = trailingMatch ? trailingMatch[1] : part
  const trailing = trailingMatch ? trailingMatch[2] : ''
  const latex = asciiMathToLatex(core)
  const html = katex.renderToString(latex, {
    displayMode: false,
    throwOnError: false,
    strict: 'ignore',
  })
  if (html.includes('katex-error')) {
    return { ok: false }
  }
  return { ok: true, html: html + escapeHtml(trailing) }
}

export function renderMathTextToHtml(text: string): string {
  const parts = text.split(/(\s+)/)
  let lastMathToken: string | null = null
  const out: string[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (/^\s+$/.test(part)) {
      out.push(escapeHtml(part))
      continue
    }

    const nextIdx = findNextNonSpaceIndex(parts, i + 1)
    const nextPart = nextIdx >= 0 ? parts[nextIdx] : null
    const nextNextIdx = nextIdx >= 0 ? findNextNonSpaceIndex(parts, nextIdx + 1) : -1
    const nextNextPart = nextNextIdx >= 0 ? parts[nextNextIdx] : null

    const useMath =
      shouldRenderAsMath(part) ||
      inequalityTripleFirst(part, nextPart, nextNextPart) ||
      inequalityTripleMiddle(lastMathToken, part, nextPart) ||
      inequalityTripleLast(lastMathToken, part) ||
      (lastMathToken != null &&
        shouldContinueSingleLetterMath(lastMathToken) &&
        isSingleLatinLetterToken(part)) ||
      singleLetterLeadingMathVariable(part, nextPart, nextNextPart)

    if (!useMath) {
      lastMathToken = null
      out.push(escapeHtml(part))
      continue
    }

    const rendered = tryRenderKatexPart(part)
    if (!rendered.ok) {
      lastMathToken = null
      out.push(escapeHtml(part))
      continue
    }

    lastMathToken = part
    out.push(rendered.html)
  }

  return out.join('')
}

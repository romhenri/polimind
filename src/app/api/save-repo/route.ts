import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { resolveTargetPath } from './paths'

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_TARGET_SAVE !== 'repo') {
    return NextResponse.json({ error: 'repo save disabled' }, { status: 403 })
  }

  const { kind, id, data } = await req.json()
  const target = resolveTargetPath(kind, id)
  if (!target) return NextResponse.json({ error: 'invalid kind or id' }, { status: 400 })

  await writeFile(target, JSON.stringify(data, null, 2))
  return NextResponse.json({ ok: true })
}

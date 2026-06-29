import { readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "public", "data", "glossaries");

export async function GET() {
  try {
    const filenames = await readdir(DATA_DIR);
    const slugs = filenames
      .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
      .map((name) => name.slice(0, -".json".length))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return NextResponse.json({ slugs });
  } catch {
    return NextResponse.json({ slugs: [] });
  }
}

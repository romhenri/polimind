import { readdir, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { seqSortValue } from "@/utils/quizSeq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const QUIZ_DIRS = [DATA_DIR, path.join(DATA_DIR, "classify")];

function collectQuizSlugs(filenames: string[]): string[] {
  const slugs: string[] = [];
  for (const name of filenames) {
    if (!name.endsWith(".json")) continue;
    if (name === "index.json") continue;
    if (name.startsWith("_")) continue;
    slugs.push(name.slice(0, -".json".length));
  }
  return slugs;
}

type SortKey = {
  slug: string;
  category: string;
  firstTag: string;
  seq: number;
  name: string;
};

/** category (A–Z) → first tag (A–Z) → seq (0,1,…) → name (A–Z) */
function compareListingKeys(a: SortKey, b: SortKey): number {
  const byCategory = a.category.localeCompare(b.category, undefined, {
    sensitivity: "base",
  });
  if (byCategory !== 0) return byCategory;
  const byFirstTag = a.firstTag.localeCompare(b.firstTag, undefined, {
    sensitivity: "base",
  });
  if (byFirstTag !== 0) return byFirstTag;
  if (a.seq !== b.seq) return a.seq - b.seq;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

async function loadListingKey(slug: string, dir: string): Promise<SortKey> {
  try {
    const raw = await readFile(path.join(dir, `${slug}.json`), "utf8");
    const parsed = JSON.parse(raw);
    const data = (Array.isArray(parsed) ? (parsed[1] || parsed[0]) : parsed) as Record<string, unknown>;
    const category =
      typeof data.category === "string" ? data.category : "";
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const firstTag = tags.length > 0 ? String(tags[0]) : "";
    const name = typeof data.name === "string" ? data.name : slug;
    const seq = seqSortValue(data.seq);
    return { slug, category, firstTag, seq, name };
  } catch {
    return {
      slug,
      category: "",
      firstTag: "",
      seq: Number.POSITIVE_INFINITY,
      name: slug,
    };
  }
}

export async function GET() {
  try {
    const entries: { slug: string; dir: string }[] = [];
    for (const dir of QUIZ_DIRS) {
      const filenames = await readdir(dir).catch(() => [] as string[]);
      for (const slug of collectQuizSlugs(filenames)) {
        entries.push({ slug, dir });
      }
    }
    const keys = await Promise.all(
      entries.map(({ slug, dir }) => loadListingKey(slug, dir))
    );
    keys.sort(compareListingKeys);
    return NextResponse.json({ slugs: keys.map((k) => k.slug) });
  } catch {
    return NextResponse.json(
      { error: "Failed to list quiz data" },
      { status: 500 }
    );
  }
}

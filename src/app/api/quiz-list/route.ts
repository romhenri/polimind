import { readdir, readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { seqSortValue } from "@/utils/quizSeq";
import { QuizListing, quizQuestionCount } from "@/types/quiz";

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

type SortedListing = {
  listing: QuizListing;
  firstTag: string;
  seqSort: number;
};

/** category (A–Z) → first tag (A–Z) → seq (0,1,…) → name (A–Z) */
function compareListings(a: SortedListing, b: SortedListing): number {
  const byCategory = a.listing.category.localeCompare(b.listing.category, undefined, {
    sensitivity: "base",
  });
  if (byCategory !== 0) return byCategory;
  const byFirstTag = a.firstTag.localeCompare(b.firstTag, undefined, {
    sensitivity: "base",
  });
  if (byFirstTag !== 0) return byFirstTag;
  if (a.seqSort !== b.seqSort) return a.seqSort - b.seqSort;
  return a.listing.name.localeCompare(b.listing.name, undefined, {
    sensitivity: "base",
  });
}

async function loadListing(slug: string, dir: string): Promise<SortedListing> {
  try {
    const raw = await readFile(path.join(dir, `${slug}.json`), "utf8");
    const parsed = JSON.parse(raw);
    const data = (Array.isArray(parsed) ? parsed[1] || parsed[0] : parsed) as Record<string, unknown>;
    const tags = Array.isArray(data.tags) ? (data.tags as string[]) : [];
    const listing: QuizListing = {
      id: typeof data.id === "string" ? data.id : slug,
      name: typeof data.name === "string" ? data.name : slug,
      description: typeof data.description === "string" ? data.description : "",
      icon: typeof data.icon === "string" ? data.icon : "",
      color: typeof data.color === "string" ? data.color : "gray",
      category: typeof data.category === "string" ? data.category : "general",
      subcategory: typeof data.subcategory === "string" ? data.subcategory : undefined,
      tags,
      hardness: (data.hardness as QuizListing["hardness"]) ?? "easy",
      type: data.type as QuizListing["type"],
      questions: quizQuestionCount(data as Parameters<typeof quizQuestionCount>[0]),
    };
    return {
      listing,
      firstTag: tags.length > 0 ? String(tags[0]) : "",
      seqSort: seqSortValue(data.seq),
    };
  } catch {
    return {
      listing: {
        id: slug,
        name: slug,
        description: "",
        icon: "",
        color: "gray",
        category: "general",
        tags: [],
        hardness: "easy",
        questions: 0,
      },
      firstTag: "",
      seqSort: Number.POSITIVE_INFINITY,
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
    const sorted = await Promise.all(
      entries.map(({ slug, dir }) => loadListing(slug, dir))
    );
    sorted.sort(compareListings);
    return NextResponse.json({ quizzes: sorted.map((s) => s.listing) });
  } catch {
    return NextResponse.json(
      { error: "Failed to list quiz data" },
      { status: 500 }
    );
  }
}
